# C-A 代理运行时 — 实施前审查

## Standards（架构与代码标准）

| 项 | 结论 | 依据 |
|---|---|---|
| 单一职责 | pass | 32 个实现文件，按 domain/ports/use-cases/infrastructure/adapters 分层；`packages/core/src/agent/use-cases/dispatch-command.ts:1-20` 只做"认命令名 + 给默认值" |
| 文件体量 | pass | 最大 `packages/core/src/agent/use-cases/dispatch-command.ts` 93 行，其次 `packages/core/src/agent/infrastructure/subagent-profiles.ts` 78 行（阈值 400） |
| 函数体量 | pass | 最长函数 `createDispatchCommand().dispatch` 约 20 行（阈值 60） |
| 嵌套深度 | fix | `packages/core/src/agent/adapters/mcp-runtime.ts:26-38` 轮询体 try + if 套 4 层 → 已抽 `poll()`，现 ≤3 层 |
| 参数与 props | pass | 端口最多 2 个参数（`prepare(sessionId, opts)`）；用例全部用对象参数 |
| 依赖方向 | pass | `packages/core/src/agent/use-cases/*` 只 import `domain/`；`infrastructure/` 与 `adapters/` 实现端口，无反向 import（`placement` 门 `✅ 30 元素落点都在层里`） |
| 错误处理 | pass | 端口失败一律回 `Outcome`/`warning`，不抛：`packages/core/src/agent/use-cases/prepare-mcp.ts:22-30` 降级路径 |
| 命名与注释 | pass | 每个文件头写"为什么这样切"；`packages/core/src/agent/domain/session-state.ts:1-12`、`packages/core/src/agent/use-cases/session-data.ts:1-8` |
| 测试覆盖 | fix | 现有 41 条单测覆盖 domain/use-cases，但 `packages/core/src/agent/infrastructure/subagent-frontmatter.ts:1` 与 `packages/core/src/agent/infrastructure/subagent-yaml.ts:1` 只被 `subagent-profiles.test.ts` 间接覆盖 → 需补直测（见下） |
| 可访问性与交互态 | na | 本能力不渲染界面（`design/ui.md` 为 `## 不适用` + 三条证据） |
| 副作用与竞态 | fix | `packages/core/src/agent/use-cases/session-start.ts:5` 的 `isInFlight` 只认当前 requestId（已修）；`packages/core/src/agent/infrastructure/mcp-host-registry.ts:12` 按 cwd 缓存，换 cwd 需 `dispose` —— 调用方尚未接（见下） |
| 死代码与重复 | fix | `packages/core/src/agent/use-cases/manage-profiles.ts:1` 一度自己包了一层 `Result` 而端口本来就返回数组/boolean → 已删（避免"两套成功/失败表达"） |

## Spec（是否满足迁移目标）

| 项 | 结论 | 依据 |
|---|---|---|
| 四条源文件的命令与事件都被覆盖 | pass | `contracts/wire.md` v0.3 的 RPC 命令表 67 行；`C5:contractInventory` `73 命令全部在契约里` |
| 行为逐条有脚本 | fix | `harness/registry.json:1` 44 条（`e2e/c-a-runtime/s-001.spec.ts:1` 等逐条落盘）；`C5:behaviorScripts` 明确标注"44 个整份是 fixme 占位，0 条真断言"——结构绿不等于实现绿，故记 fix 而不是 pass |
| 落点与设计一致 | pass | `C5:lines` `7673 行 / 24 区间闭合`、`C5:drift` `30 个元素全部落地` |
| 砍单有影响评估 | pass | `cut-list.md` 1 条（`ChatWindow.tsx:1665-2282` 扩展 UI）+ `changes/CHG-005.md` |

## 待办（本轮未做，必须显式记账）
1. `infrastructure/subagent-frontmatter.ts` / `subagent-yaml.ts` 直测（当前只经 `subagent-profiles.ts` 间接覆盖）。
2. `mcp-host-registry` 的 `dispose` 尚未有调用方：换 cwd 时旧 host 不会被清理（属会话编排接线时补）。
3. 44 条 e2e 仍是 `test.fixme`：阻塞条件是 `/api/agent` SSE 路由（H2）。
