# 前端架构约定 — `arch/frontend.md`

> P2.5 门 `frontendArch` 检查：**8 个精确标题** + 整篇 ≥600 字 + `arch/rules.json#frontend`（`layers`≥3、`stateClasses`≥3 且每项有 `rule`/`forbidden`、`forbidden`≥1、`budgets` 有正数、`doc` 指向本文件）。
> 后端已有 Clean Architecture 的约束（`layerOrder`/`forbiddenEdges`）；前端过去只有"用 shadcn、状态放 zustand"这种口头默契，本文件把它变成可判定约定。

## 1. 分层与目录

四层，依赖单向：`route → feature → lib → ui`。

| 层 | 目录 | 可以 import | 不许 import | 为什么 |
|---|---|---|---|---|
| route | `packages/web/src/app` | `components`、`lib` | `core/adapters` | route 只做参数校验 + 调用用例（或读侧 API），不许直接碰存储 |
| feature | `packages/web/src/components` | `lib`、`components/ui` | `app/api` | 组件不认识 HTTP 细节 |
| lib | `packages/web/src/lib` | core 的 DTO/zod | `react`、`next` | 纯逻辑可单测，不许有 hook |
| ui | `packages/web/src/components/ui` | `lib`、`react` | feature 层 | 原语不认识业务 |

## 2. 状态的分类与归属

四类，见 `rules.json#frontend.stateClasses`：`server-data`（store + 失效广播）、`user-preference`（localStorage，键名冻结）、`selection`（store 真源 + URL 镜像）、`transient`（组件内）。

判据一句话：**问三个问题**——刷新后要不要还在？别人打开同一链接要不要看到一样？会不会被外部改？答"会"就往 store/URL 走，答"不会"就留在组件里。

## 3. 数据获取与缓存

1. 组件不直接 `fetch`；一律走 `lib/api-client`（统一 baseURL、错误码映射、zod 解析）。
2. 缓存按**范围键**（`sessions` / `files` / `mcp` / `models`），失效广播带范围。
3. 同一范围并发请求合并（in-flight 去重），避免切 tab 打三遍。
4. 过期策略：先给缓存再后台刷新（stale-while-revalidate），首屏不许白屏等网络。

## 4. 三态与错误

每个数据区域必须显式处理 `loading` / `empty` / `error` 三态：

| 态 | 表现 | 禁止 |
|---|---|---|
| loading | `skeleton.tsx` 骨架，保持布局不跳 | "Loading..." 文本 |
| empty | `card.tsx` + 一句可操作文案（如"点这里新建会话"） | 空白 div |
| error | 行内错误 + 重试按钮；错误码取自封闭枚举 | 全屏错误页（会丢掉其他区域） |

## 5. 组件与 props

1. 单个组件 ≤400 行；props ≤6 个，超过就拆容器/视图。
2. **不许把 setter 往下传**：子组件只发意图（`onSelect(id)`），不接 `setX`。
3. 受控/非受控必须二选一并写清；同一组件不许两种模式混用。
4. 列表渲染必须稳定 key（用实体 id，不用数组下标）。

## 6. 样式与 token

1. 只用 shadcn token（`background/card/muted/border/foreground/primary`），**不写死 `rgb()`/hex**，也不用 pi-web 的 `--color-*` 命名空间。
2. 间距/圆角不可配置；字号/字体可配置（走 token 变量）。
3. 复用 16 个既有原语；缺的原语先补 `components/ui`，不在能力里写局部实现。
4. 暗色模式由 token 承担，组件里不许出现 `dark:` 条件色。

## 7. 可访问性与键盘

1. 语义优先：按钮用 `<button>`，开关用 `switch.tsx`（`aria-checked` 由原语承担）。
2. 焦点管理：弹层打开焦点进入、关闭回触发器；`Tab` 顺序等于视觉顺序。
3. 全局快捷键只有 `Esc`（中止）与 `Ctrl+Alt+N`（新建），必须在菜单里可见。
4. 状态播报：非错误用 `role="status"`，错误用 `role="alert"`。

## 8. 测试与预算

| 层 | 测什么 | 工具 |
|---|---|---|
| lib | 纯函数与解析（含 zod 契约） | vitest |
| feature | 交互意图与三态（不测样式） | vitest + testing-library |
| route | 状态码/错误码/契约解析 | vitest（node 环境） |
| 对账 | 与 pi-web 的 a11y 锚点对照 | `harness/assert.mjs` + 快照 |

预算（`rules.json#frontend.budgets`）：props ≤6、单组件 ≤400 行、首屏 ≤2000ms、交互反馈 ≤300ms。超预算必须在 `design/quality.md` 写明理由，否则 C5 质量门红。
