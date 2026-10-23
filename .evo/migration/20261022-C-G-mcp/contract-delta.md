# 契约对齐 — C-G / `McpConfig.tsx`（2258 行）

> 目标：本能力用到的**命令 / 事件 / URL / i18n 键 / token / 共享原语**都能指到冻结契约里的一行；要改就提变更单。
> 本文件由 C2 门校验：`contractAlign`（每行指针可核对、有差异必须有 `CHG-n`）、`contractDelta`（变更单内容）、`contractInventory`（源码命令 ⊆ wire）、`externalIo`（**沿 import 追到的命令也要在 wire 里**）。

## 对齐表

| 面 | 本能力实际用到 | 契约位置 | 状态 |
|---|---|---|---|
| 技能面板 HTTP | 7 条命令（见下 §外部依赖），本文件自身 **0 次 `fetch`** | `20261022-mig/contracts/wire.md` 第 25–45 行（C-G 段） | 已核对，全部在案 |
| 会长流程 HTTP | `POST /api/mcp/sign-in`、`GET/POST/DELETE /api/mcp/sign-in/[flowId]` | `wire.md:39-42` | 已核对（动态段用 `[flowId]` 占位，`flowUrl()` 拼出来的是实例路径） |
| Code mode 写入 | `PUT /api/tools/settings`（一个端点承载 preference / mode / inlineBudget 三个字段） | `wire.md` 的 `PUT /api/tools/settings` 行 | 已核对 |
| 项目信任 | `POST /api/project-trust` | `wire.md` 的 `POST /api/project-trust` 行 | 已核对（信任对话框属 AppShell，本能力只发请求） |
| SSE 事件 | 无（本面板不订阅流） | `wire.md` §事件 | 不涉及，已确认 0 处 |
| URL 深链 | 无（`getLastSettingsSelection("mcp", cwd)` 存的是 localStorage 选择项，不进 URL） | `20261022-mig/contracts/routes.md` | 不涉及，已确认 |
| i18n | **87 个唯一键**，全在 `mcp.*` 命名空间（`mcp.codemode` 26 / `mcp.test` 14 / `mcp.detail` 12 / `mcp.server` 10 / `mcp.add` 6 / `mcp.inProject` 4 / `mcp.exposure` 3 / `mcp.footer` 2 / 其余 10） | `20261022-mig/contracts/i18n.md` 的 `mcp.` 命名空间（546 键） | 已核对：键前缀与冻结命名空间一致，**不新增命名空间** |
| token | 本文件 **0 处 `var(--…)`**——样式全在 `./SettingsUi` 与 `Config*` 原语里 | `contracts/design-system.md` 的 `--color-*` 族 | 不涉及本文件；由原语承担 |
| 共享原语 | **28 个 `Config*`**（`ConfigButton` / `ConfigDetail*` / `ConfigSidebar*` / `ConfigSwitch` / `ConfigTrustNotice` / `ConfigScopeSwitch` …） | 无（属底盘 H1，`arch/rules.json#sharedPrimitives` 未就绪） | 见 §核对结果 D-01 |

## 外部依赖（god 自己不写 `fetch`，HTTP 全在 import 进来的兄弟模块里）

| 模块 | 提供的命令 | 契约位置 | 本能力是否改它 |
|---|---|---|---|
| `components/mcp-config-helpers.ts` | `GET /api/mcp`（`:837` 拼 `?cwd=`）、`POST /api/mcp`、`POST /api/mcp/test`、`PUT /api/tools/settings`（`:938`）、`POST /api/project-trust` | `wire.md:28-45` | **要改**：`loadMcpOverview` 等 8 个函数是本能力的端口实现基础，C5 会按端口重写成 `P-S-04/P-S-05/P-S-06` 的 adapters |
| `components/mcp-add-helpers.ts` | `POST /api/mcp`（添加服务器） | `wire.md` 的 `POST /api/mcp` 行 | 不改：与「添加」面板共用，本能力只调用 |
| `components/mcp-sign-in-helpers.ts` | `POST /api/mcp/sign-in`、`GET/POST/DELETE /api/mcp/sign-in/[flowId]` | `wire.md:39-42` | 不改：签到流程由服务端持有，本能力只轮询 |

> `externalIo` 门就是查这张表：沿 `McpConfig.tsx` 的 import 追 2 层，凡能追到 `/api/…` 的模块必须在此登记，且追到的每条路径必须在 `wire.md` 里。

## 核对结果

- **D-01 28 个 `Config*` 共享原语无契约归属**：与 `SkillsConfig` 同一个问题（那轮是 25 个）。这些原语属底盘 H1，`arch/rules.json#sharedPrimitives` 尚未列出。本能力**只消费不改**；H1 落地时它们的 props 契约会成为 D-02 的输入。
- **D-02 `PUT /api/tools/settings` 是"一端点三字段"**：preference / mode / inlineBudget 共用一个 PUT。契约只记了端点，没记字段级语义。本能力的三处保存要靠 `PR-06`（乐观保存 + 失败回滚到上一次值）保证一致性——**不是契约缺口，但 C5 必须按字段级幂等实现**。
- **D-03 签到是"服务端持有流程 + 客户端轮询"**：`GET /api/mcp/sign-in/[flowId]` 的轮询间隔与终止条件没有写进契约。本能力按 `pollRound` 每轮刷新；契约里补一句"轮询方不持有超时判定"是 H1 的事，不在本能力。
- **结论：本能力不改契约，无需变更单。** 三条 D-01…D-03 都是"底盘未就绪 / 字段级语义待补"的施工状态，不构成契约缺口；其中 D-02 的字段级幂等已写进 `design/manifest.json` 的 `PR-06`。
