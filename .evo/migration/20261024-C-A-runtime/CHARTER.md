# C-A 代理运行时 — 立项章程

## 1. 范围

- **本能力覆盖四个文件（共 7,669 行）**，它们是 pi-web 的"事件源 + 命令分发"中枢：
  | 文件 | 行数 | sha1 | 角色 |
  |---|---|---|---|
  | `hooks/useAgentSession.ts` | 2805 | `2356070f51c0cdee1bcc9d49b3e56fa436472b34` | 前端会话状态机 + SSE 事件归约（~1300 声明） |
  | `lib/rpc-manager.ts` | 2757 | `47f45165b6fdb0777e553783cde87f25742cc17c` | 后端协调者：`AgentSessionWrapper` + 命令分发 |
  | `lib/mcp-host.ts` | 1105 | — | MCP Host 运行时（server 生命周期、工具暴露） |
  | `lib/subagents.ts` | 1002 | — | 子代理运行时（spawn / 结果汇聚） |
- 判据：`GODS.md` 第 38–41 行四行全部落在本能力，行数合计 7,669。
- 下游：C-B 会话编排、C-C 会话面、C-D 输入区都依赖它（`GODS.md:105` 推论）。

## 2. 基线指纹

- `hooks/useAgentSession.ts` **2805 行** / sha1 `2356070f51c0cdee1bcc9d49b3e56fa436472b34`
- `lib/rpc-manager.ts` **2757 行** / sha1 `47f45165b6fdb0777e553783cde87f25742cc17c`
- `lib/mcp-host.ts` **1105 行**、`lib/subagents.ts` **1002 行**（两者 sha1 由 C1 的 `enumerate-symbols` meta 记录）
- 合计 **7,669 行**，与 `GODS.md:112` 的 C-A 行数一致；任何一行变化都要重跑 C0。
- 判据：`state.json` 的 `gods[].fingerprint` 与上表一致（`godFingerprint` 门）。

## 渲染边界

| 区域 | 宿主 | 说明 |
| --- | --- | --- |
| （无） | none | 本能力是基础设施：7,669 行的 agent 运行时，不渲染任何界面 |

基础设施没有"这一屏上还有谁"——它没有屏。渲染权全部属于上层能力（C-C 会话面 / C-B 会话编排）。
证据：`ref_projects/pi-web/hooks/useAgentSession.ts:1463`（命令分发返回 `Promise<unknown>`，不返回 JSX）。

## 3. 不做清单

- **不迁 pi-web 的 React 表现层**：本能力的产物是 core 侧运行时 + web 侧 store/hook，不搬 JSX。
- **不迁子代理的编排 UX**（`subagents.ts` 只迁运行时语义，子代理面板归 C-E/C-F 的后续能力）。
- **不做多用户/多租户**：本仓是单机单用户工具，pi-web 也没有。
- **不重写协议**：SSE 事件类型（16 种）与命令集合（97 条）已在 `20261022-mig/contracts/wire.md` 冻结，本能力只消费。

## 4. 验收门

| 层 | 判据 |
|---|---|
| L1 | `packages/core/src/agent` 的单测覆盖事件归约、命令分发、错误映射；`T-xx` 标注齐全 |
| L2 | `tsc -p packages/core` 干净；`arch/rules.json` 的层向与 `layerPaths` 全部命中 |
| L3 | 组件测试覆盖"事件流 → 状态"的三态（connecting / streaming / failed） |
| L4 | 与 pi-web 双开对账：同一命令序列在两侧产出相同会话行（`harness/parity.mjs`） |
| L5 | 不适用（本能力 `api` 表面点 0，HTTP 由 C-G 与 C-B 承担） |
| L6 | 用户手工验收：单会话从发送到落盘全链路可用 |

## 5. 已知风险

1. **两个 2.7k 行的文件互相依赖**（`useAgentSession` ← `rpc-manager`）→ 必须先切"事件归约"再切"命令分发"，否则等于把 god 文件搬个位置。
2. **2805 行里 ~1300 个声明**：LSP 分母亲测会到 1000+ 量级，C1 的行级覆盖必须配合 ownership 逐段切，不能只靠符号对账。
3. **SSE 事件顺序语义**：pi-web 用 `eventSeq` 丢弃过期事件（`useAgentSession.ts` 的 generation 机制），迁移时若弄错顺序，表现是"偶发丢最后一条"，很难复现。
4. **`mcp-host.ts` 与 C-G 的 MCP 设置耦合**：宿主列表与工具暴露必须复用 C-G 的 `@evo-pi/core/mcp` 端口，不许另起一套。

## 6. 容量假设

- R3，预估 **4–6 天**（C0–C7 全流程）。
- 分两次交付：第一次"事件归约 + 命令分发"跑通单会话（C-A-1，约 3 天），第二次"mcp-host + subagents 运行时"（C-A-2，约 2–3 天）。
