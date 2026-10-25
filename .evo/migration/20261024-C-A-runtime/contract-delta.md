# C-A 契约对齐（useAgentSession / rpc-manager / mcp-host / subagents）

> 契约来源：`20261022-mig/contracts/{wire,data-format,i18n,design-system,interaction,routes}.md`
> wire 版本：**v0.3**（2026-10-24，CHG-002）。本能力不改 HTTP 契约，但补了一层**RPC 命令表**。

## 对齐表

| 维度 | 结论 | 契约位置 |
|---|---|---|
| HTTP 命令（11 个 api 表面点） | 全部已在契约里：`GET /api/sessions/[id]`、`GET /api/sessions/[id]/state`、`POST /api/agent/[id]/lease`、`POST /api/agent/new`、`GET /api/agent/[id]`、`PUT /api/models/default` | `contracts/wire.md` 的 `## 命令` 表（97 行，含 `app/api/agent/[id]/route.ts:73` 等证据） |
| **RPC 命令（43 个 command 表面点）** | **契约原本没有这一层**：`rpc-manager.ts` 分发的是 pi SDK 的 rpc 命令名，`useAgentSession.ts` 处理对应事件。已按 CHG-002 补表 | `contracts/wire.md` 的 `## RPC 命令` 表（67 行，含每条 `file:line`） |
| SSE 事件 | 本能力**不直接消费** SSE（`/api/agent/[id]/events` 由 `agent-client.ts` 拉），事件名仍是 RPC 事件名 | `contracts/wire.md` 的 `## 事件` 表 + `## RPC 命令` 的 `类型=事件` 行 |
| 数据格式（会话 JSONL） | `get_session_stats` / `get_state` 读的是会话文件，字段全集由 zod 覆盖：**DTO 15 字段 / schema 全命中** | `contracts/data-format.md` + `contracts/schema.ts`（`checkSchema` 实测通过） |
| i18n | 本能力**不渲染文案**（`subagents.ts` 只拼 frontmatter 与提示词），键集合为空 | `contracts/i18n.md`（无新增，无需 CHG） |
| token / 样式 | 本能力**不产出 CSS 变量**（无 JSX） | `contracts/design-system.md`（无新增） |
| URL / 深链 | 本能力只接受 `session` 与 `cwd` 参数，路由规则不变 | `contracts/routes.md` |
| 交互（键盘/焦点） | 事件名与命令名一致，**语义不变**；`extension_ui_*` 的四种交互（confirm/select/editor/input）语义见下表 | `contracts/interaction.md` + 下方 D-03 |

## 外部依赖

| 模块 | 命令 | 处置 |
|---|---|---|
| `lib/agent-client.ts` | `GET /api/agent/[id]`、`GET /api/agent` | 契约已有；迁移后成为 `P-S-0x agent-client` 端口的 HTTP 适配器实现 |
| `lib/session-stats.ts` | `GET /api/sessions/stats` | 契约已有；同上 |

## 差异与处置

| 编号 | 差异 | 处置 |
|---|---|---|
| D-01 | 冻结契约只有 HTTP + SSE 事件两层，**没有 RPC 命令层**，而 `rpc-manager.ts` 的实现单位正是 rpc 命令 | **CHG-002 已应用**：wire → v0.3，新增 `## RPC 命令` 67 行（43 个表面枚举点 + 24 个 rpc-manager 侧命令），每条带 `file:line` |
| D-02 | `enumerate-surface` 曾把 `/api/sessions/${id}/state` 归一成 `/api/sessions//state`，导致 3 条假"契约缺" | **工具缺陷 G-20 已修**：插值位置归一为 `/[id]`，再压重复斜杠 |
| D-03 | `extension_ui_request` 的四种交互在 `interaction.md` 里只写了"确认/选择"两类 | 不新增 CHG：`interaction.md` 的「确认」覆盖 `confirm`，「选择」覆盖 `select`，`editor`/`input` 归入「输入」；C4 协议表里逐条列出（PR-0x） |
| D-04 | `subagents.ts` 产出 markdown frontmatter 文件，**不是 UI**，契约里没有对应维度 | 归入 `data-format.md` 的「文件类产物」段（C4 补一行即可，不改契约语义） |

## 核对结果

- `check-contracts`：`✅ 命令 73 / 事件 0 全部在契约里`、`✅ DTO 15 个字段被 schema 覆盖`。
- `externalIo`：2 个外部模块（`agent-client.ts`、`session-stats.ts`）已登记，HTTP 调用全部命中契约。
- **本能力不改 HTTP 契约；唯一契约变更（CHG-002）是补一层原本缺失的 RPC 命令表**——这是"分母不存在所以永远达标"的第 4 次复现（前三次：`contractInventory` 不抽 fetch、god 不写 fetch、外部模块藏 HTTP）。
