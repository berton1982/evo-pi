# 架构 — evo-pi（迁移期全局约定）

> 本文件是**全局承诺**：任何一个能力的设计都不能违反这里，违反就要改本文件（改本文件要重新送签）。
> 机器版本是 `arch/rules.json`（`check-phase` 的 `archRules` / `commMatrix` 读它，`design-gate` 的 D6/D10 也读它）。

## 1. 层与禁止边

依赖只能向内：

```
web/ui ──► core/use-cases ──► core/domain
                │
                └──► core/ports ◄── core/adapters ◄── core/infrastructure
```

| 层 | 目录 | 可以 import | 不许 import |
|---|---|---|---|
| presentation | `packages/web/src/app`、`packages/web/src/components` | use-cases 的工厂与 DTO（zod） | `core/adapters`、`core/infrastructure`、`node:fs` |
| application | `packages/core/src/*/use-cases` | domain、ports | adapters、infrastructure、`next/*`、`react` |
| domain | `packages/core/src/*/domain` | 仅同层与 `_shared/domain` | 任何 IO、任何框架、`process.env` |
| ports | `packages/core/src/*/ports` | domain 类型 | 实现、框架 |
| adapters | `packages/core/src/*/adapters` | ports、domain | use-cases、`next/*` |
| infrastructure | `packages/core/src/*/infrastructure` | ports、node 内置 | use-cases、`next/*`、`react` |

**三条禁止边**（历史踩过）：
1. `web/** → core/**/adapters`：前端拿到 adapter 就会绕过用例写数据。
2. `use-cases → adapters`：用例依赖实现，端口就白设了。
3. `route 模块顶层 `const x = createX()``：import 时求值会把配置（尤其 `PI_CODING_AGENT_DIR`）钉死，测试与多 agentDir 部署都会串目录（P2 真实修复过：`packages/web/src/app/api/sessions/[id]/context/route.ts`）。

**纯函数白名单**（允许跨层直接 import）：`packages/core/src/_shared/domain/**` 与 `packages/web/src/lib/{i18n,format}**`。


### 1.4 包的边界 = 运行时的边界（2026-10-23 补，实测代价：`next build` 直接失败）

- **adapters / infrastructure 住在 core**（与 `packages/core/src/session/{adapters,infrastructure}` 一致），
  不在 web 里另起一套。web 只能通过 `@evo-pi/core/<context>` 这个入口拿实现。
- **一个 context 至少两个入口，按运行时切**：
  - `@evo-pi/core/mcp` —— 浏览器安全（domain / use-cases / adapters，只有 `fetch`）；
  - `@evo-pi/core/mcp/server` —— node-only（infrastructure，`node:fs`）。
  把两者塞进同一个 barrel，客户端组件 import 一次就会把 `node:fs` 拖进浏览器 chunk。
- **表现层不直接调 domain 里的拼装函数**：`scopeLabel` / `displayPath` / `groupStatusText`
  这类"给人看的字符串"应由用例或 hook 先组装好，组件只渲染。组件里出现业务分支即视为越层。

## 2. 通信机制

每类交互**只有一个机制**，见 `arch/communication.md` 的 C-01…C-10 矩阵（含反例列）。三条要点：

1. **通知只有一个 sink**：`components/app-shell/` 的 toast 容器；能力只能用 `notify()`，不许自建容器。
2. **失效广播带范围**：`sessions` / `files` / `mcp` / `models`，禁止"全表失效"。
3. **跨前后端的同一份数据只有一个真源**：会话文件在磁盘（`$PI_CODING_AGENT_DIR`），内存索引是可丢缓存。

## 3. 状态归属

| 类别 | 放哪 | 判据 | 典型写错 |
|---|---|---|---|
| 服务端数据（会话列表、文件内容、模型目录） | zustand store + 失效广播 | 有网络往返、可能被外部改 | 塞进 `useState`，切页即丢 |
| 长期 UI 偏好（语言、字体、栏宽） | `localStorage` + 一个 store | 刷新后必须还在 | 放进 URL 或组件 state |
| 当前选中（激活会话、打开的文件、设置 tab） | store（真源）+ URL（镜像） | 需要分享链接 / 前进后退 | 只放 URL，或只放组件 state |
| 瞬时交互（输入草稿、悬停） | 组件 state | 只影响当前组件、不需要分享 | 塞进全局 store 造成全局重渲染 |

**一个状态只有一个所有者**：`design/manifest.json` 的 `states[]` 会逐个声明 owner，D3/D12 会判红重复持有。

## 4. 错误分类

封闭枚举：`session_not_found` / `cwd_invalid` / `model_unavailable` / `provider_auth_required` / `internal`（见 `contracts/wire.md`）。

| 层 | 用什么表达 | 不许 |
|---|---|---|
| domain | 抛具体错误类（`SessionNotFoundError`） | 抛字符串 |
| use-cases | 返回结果对象 `{ok:false, error}` | 抛业务错误给 UI（除了 domain 的"不可能"断言） |
| adapters | 把 IO 失败翻译成 domain 错误 | 泄露 `ENOENT` 之类原始错误给 UI |
| route | 映射成 HTTP 状态 + 错误码 | 返回 200 + `{error}` |
| UI | `role="alert"` toast，同错 3 秒去重 | 静默吞掉 |

## 5. 流式与订阅

1. **唯一入口**：SSE 只有 `/api/agent/[id]/events` 一条；不许前端轮询。
2. **唯一 reducer**：事件 → 消息状态只在 `useAgentSession` 一类 reducer 里处理；组件不许各自解析事件。
3. **取消**：切会话必须 `abort()`，旧流的迟到事件按 `sessionId` 丢弃（不许"串台"）。
4. **背压**：文本增量按帧合并（`requestAnimationFrame`），不逐 token 触发 React 重渲染。
5. **断线**：SSE 断开后最多重连 3 次，退避 1s/2s/4s；超过则显示"连接已断开"并提供手动重连。

## 6. 与 ADR 的对应

本文件的每条约定都能追到 ADR 或既有实现：层与禁止边 → ADR 0003（Clean Architecture）；单数据源 → MEMORY §6.1；流式唯一入口 → `ref_projects/pi-web/app/api/agent/[id]/events/route.ts:33`；状态归属 → pi-web 的 zustand store 现状（5 个 store）。
