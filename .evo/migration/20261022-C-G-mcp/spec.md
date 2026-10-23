# 能力规格 — C-G（MCP 设置）

> 本文件是**实施前的约定**：写清"用户要什么、源码在哪、长什么样、放在哪"。
> 用户审核签字后才进 C4/C5；机器判据见 `references/rules.md` #26/#27。

## 用户故事

| 故事 | 角色 | 触发 | 期望 |
|---|---|---|---|
| U-01 | 使用者 | 从侧栏点「设置」打开面板并切到 MCP 分区时 | 看到按作用域分组的服务器列表，每行有启用开关与状态点，正在读取时显示占位 |
| U-02 | 使用者 | 点列表里的某个服务器时 | 右侧出现详情：名称、作用域、传输、命令/URL、来源文件路径、可展开的原始字段 |
| U-03 | 使用者 | 点某个服务器的「测试」按钮时 | 就地出现测试状态（运行中 / 成功+工具清单 / 失败+错误日志），失败可再点一次重来 |
| U-04 | 使用者 | 用组头的开关批量启用/停用一组服务器时 | 该组内服务器逐条切换，失败的保持原状并逐条提示，成功的可撤销 |
| U-05 | 使用者 | 没有任何 MCP 配置第一次进入时 | 直接看到两份配置文件路径与可抄的 JSON 示例，并能就地添加一条 |
| U-06 | 使用者 | 项目目录从未被信任时 | 进入 MCP 分区前被要求先信任项目，未信任时不展示项目级配置 |

## 源码覆盖

| 文件 | 行区间 | 覆盖内容 |
|---|---|---|
| `ref_projects/pi-web/components/McpConfig.tsx` | `L1-L173` | 导入、类型别名、Translate 契约 |
| `ref_projects/pi-web/components/McpConfig.tsx` | `L174-L355` | scopeLabel/displayPath/noticeText/failureText 等文案与路径辅助 |
| `ref_projects/pi-web/components/McpConfig.tsx` | `L356-L625` | `AddSkillPanel`→`McpAddServer` 面板（表单、传输切换、校验提示） |
| `ref_projects/pi-web/components/McpConfig.tsx` | `L626-L831` | `McpConfig` 容器：加载、选中、开关、批量、测试、Code mode 的编排 |
| `ref_projects/pi-web/components/McpConfig.tsx` | `L832-L1215` | `McpConfigView` 两栏布局（左列表 + 右详情）与空态 |
| `ref_projects/pi-web/components/McpConfig.tsx` | `L1216-L1410` | 分组、行、字段 chips、名称列表等展示件 |
| `ref_projects/pi-web/components/McpConfig.tsx` | `L1411-L1711` | `McpServerDetail`：字段表、来源路径、原始 JSON 展开 |
| `ref_projects/pi-web/components/McpConfig.tsx` | `L1712-L1958` | 状态输出与测试状态（日志行、工具清单、state 词） |
| `ref_projects/pi-web/components/McpConfig.tsx` | `L1959-L2258` | 状态行与 Code mode（模式、内联预算、保存失败提示） |
| `ref_projects/pi-web/components/mcp-config-helpers.ts` | `L39-L140` | 行状态机：`MCP_SERVER_ROW_STATES`、`mcpServerRowState`、行上下文 |
| `ref_projects/pi-web/components/mcp-config-helpers.ts` | `L225-L320` | 状态时间与状态文案（`mcpStatusTimeText`、session 摘要） |
| `ref_projects/pi-web/components/mcp-config-helpers.ts` | `L700-L1515` | 读写 `/api/mcp`、`/api/tools/settings`、`/api/project-trust` 的调用与结果归一 |
| `ref_projects/pi-web/components/SettingsUi.tsx` | `L20-L140` | `ConfigPanelShell` / `ConfigSplitView` / `ConfigSidebar` 等两栏原语 |
| `ref_projects/pi-web/components/SettingsUi.tsx` | `L140-L420` | `ConfigRow` / `ConfigSwitch` / `ConfigField` / `ConfigBadge` 等行内原语 |
| `ref_projects/pi-web/components/SettingsPanel.tsx` | `L600-L634` | MCP 分区挂载点（`sectionHost("mcp", <McpConfig embedded …>)`） |
| `ref_projects/pi-web/components/AppShell.tsx` | `L222-L232` | `settingsSection` 状态（null = 关闭） |
| `ref_projects/pi-web/components/AppShell.tsx` | `L1475-L1476` | 侧栏「设置」按钮（`title`/`aria-label` = `common.settings`） |
| `ref_projects/pi-web/components/AppShell.tsx` | `L2764-L2780` | 设置面板的渲染条件与关闭回写 |

## 交互与导航

- 机制：**panel** —— pi-web 的设置不是独立路由，而是 AppShell 内按 `settingsSection` 条件渲染的整屏面板（`ref_projects/pi-web/components/AppShell.tsx:2764` + `:223`），由侧栏按钮（`ref_projects/pi-web/components/AppShell.tsx:1475`）触发，关闭时把 `settingsSection` 置回 `null` 并触发刷新。
- MCP 是面板里的一个分区：`ref_projects/pi-web/components/SettingsPanel.tsx:629` 的 `sectionHost("mcp", <McpConfig embedded …>)`。
- 迁移沿用：evo-pi 侧已有三区壳与 `components/zones/SettingsPanel.tsx`，MCP 必须挂进同一个面板分区，**不做 `/settings/mcp` 独立路由**（本轮试点的做法已废弃）。

## 与 pi-web 的布局映射

| pi-web 区域 | evo-pi 目标 | 差异 |
|---|---|---|
| 设置整屏面板（左分区导航 + 右内容） | `components/zones/SettingsPanel.tsx` 的 MCP 分区 | 沿用两栏结构，不新增路由 |
| MCP 左侧服务器列表（按 user/project 分组，组头带开关与状态） | `C-03 McpServerList` 挂进 `ConfigSidebar` | 沿用；分组键由 `mcp-config-helpers.ts` 的 `scope` 决定 |
| MCP 右侧详情（名称/传输/命令/来源/测试状态/Code mode） | `C-04 McpServerDetail` + `C-05 McpTestStatus` + `C-06 McpCodemode` | 沿用纵向分节；Code mode 独立成折叠节 |
| 空态（无配置时给出路径与示例） | `C-07 McpEmptyState` | 沿用；额外把两份配置的绝对路径写进空态 |
| 项目信任门槛 | `C-01 McpPanel` 在未信任时只显示信任入口 | 沿用；信任对话框复用 `ProjectTrustDialog` 行为 |

## 不做清单（不做 = 明确不做，不是"以后再说"）

| 项 | 为什么本次不做 | 谁来接 |
|---|---|---|
| Code mode 面板（含内联预算 `McpConfig.tsx:L2118-L2258`） | 用户决定本次不迁；它与状态行耦合松、可独立立项 | 另立 R1 能力（C-G-CM） |
| 项目信任对话框（`ProjectTrustDialog.tsx`） | 属 chassis H1 的对话框族，本能力只消费入口 | chassis H1 |
| 签到（sign-in）UI | 服务端流程未就绪，本能力只保留端口与用例 | 下一次迭代 |

## 人工决策（本轮已定，逐条留痕）

| 决策项 | 结论 | 决策人 |
|---|---|---|
| 交互形态 | **panel**：挂进 AppShell 的设置弹窗，删除 `/settings/mcp` 独立路由 | 用户（2026-10-23） |
| 保真度基线 | 同层级、同信息量：分组/详情字段/状态行/空态引导必须都在，像素级不强制 | 用户 |
| 本次不迁 | Code mode 面板、项目信任对话框（见不做清单） | 用户 |
| 契约变更批准权 | wire/schema 的改动必须走 CHG 并由用户批；本能力零改动 | 用户 |
| R 级判定 | R2（2258 行、跨 5 文件）——保留时序图与 worktree | 用户 |
| 运行时/包边界 | `@evo-pi/core/mcp`（浏览器安全）/ `@evo-pi/core/mcp/server`（node-only） | 用户 |
| 新依赖 | 不新增（测试用官方 stdio stub，不引 mcp SDK） | 用户 |
| i18n 键策略 | 沿用 `mcp.*` 命名空间，不自造新前缀 | 用户 |
| 预算 | 单文件 400 行、props 6 不变；容器页允许到 500 并在 quality.md 写明理由 | 用户 |
| 割接窗口 / 回滚责任人 | 试点阶段不割接；L6 由用户本人执行 | 用户 |
| 检查点 | C3 规格、C4 设计、C6 对账后各一次人工「继续/停」 | 用户 |

## 待用户确认的开放问题

1. 测试状态的「工具清单」是否默认折叠（pi-web 全展开；长列表会顶掉详情）——建议 >5 个折叠。
