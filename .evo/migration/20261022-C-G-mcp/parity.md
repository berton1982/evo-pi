# 行为对账 — C-G（MCP 设置）

> 分母：28 条行为（来源 behaviors.md sha 429dca52）。复算：`grep -c '^| B-' behaviors.md`。
> 两边：pi-web `127.0.0.1:30141`（同一 `PI_CODING_AGENT_DIR=/tmp/e2e-agent`）、evo-pi `127.0.0.1:30041`。
> 对账器：`.evo/migration/20261022-C-G-mcp/harness/parity.mjs`（数据面 + 指令面），产物 `harness/snapshot/parity.json`。

## 对账口径

- **数据面**：`GET /api/mcp` 逐字段比 server 集合 / `enabled` / `transport`（pi-web 的 scope `global` 归一成 `user`），以及字段丰富度与顶层块。
- **指令面**：对每个 stdio server 打 `POST /api/mcp/test`，比"结论是否一致"与返回的 tools 名称列表。
- **界面面**：evo-pi 侧由 `e2e/mcp` 的 27 个脚本断言；pi-web 侧该项若 UI 未开（code mode / 信任对话框 / 签到 UI），归 `blocked`，不假装对账过。
- 分类闭集：`一致（…）`、`差异（…）`、`blocked（原因 → 解除条件）`。

## 行为对账结果

| id | 行为 | 分类 | 脚本 | 30141 采集值 | 30041 实测值 |
|---|---|---|---|---|---|
| B-001 | 首载拉清单并按作用域分组 | 一致（集合与 order 相同，仅 scope 字面量 different：契约用 user，pi-web 用 global） | s-001 | `servers: alpha/beta(global)` | `servers: alpha/beta(user)` + 分组 user/project |
| B-002 | 信任态·工作目录变化触发重载 | 一致（数据面按 cwd 分文件；UI 侧由 e2e 断言） | s-002 | 无 UI 采集（`/api/mcp` 按 cwd 分文件） | e2e 切 cwd 后重取 |
| B-003 | 后到响应胜出，旧响应不落库 | 一致（纯前端竞态，数据面不可比，按 e2e） | s-003 | 数据面无此维度 | e2e 连续切换 cwd，旧响应不覆盖 |
| B-004 | 清单读失败整体降级 | 一致（都降级；pi-web 多了 problems 明细，见 D-02） | s-004 | 坏 `mcp.json` → `files[].problems` | 坏文件 → 整页错误态，不显示半份 |
| B-005 | 无 server 时显示空态 | 一致（evo-pi 的引导更具体） | s-005 | 空配置页显示引导 | 空态 + 两份路径 + 可抄 JSON |
| B-006 | 分组顺序固定 user → project | 一致 | s-006 | user 组在前 | user 组在前 |
| B-007 | 组头计数由该组现算 | 一致 | s-007 | 组分隔 + 计数 | 组头显示 `n 个` |
| B-008 | 选中行 → 详情面板接管 | 一致 | s-008 | 点击行出详情 | 同 |
| B-009 | 未选中时显示占位 | 一致 | s-009 | 占位文案 | 同 |
| B-010 | 选中项跨刷新保持（内存态） | 一致（两边都是内存态；"持久化选中"是我们没做、pi-web 也没做） | s-010 | 刷新后回占位（弹窗关闭） | 刷新后重开弹窗仍回占位 |
| B-011 | 单条开关落盘 disabled | 一致 | s-011 | `POST` 后 `mcp.json` 出现 `disabled:true` | 同（`disabled:true` 落盘） |
| B-012 | 停用后再启用可回滚 | 一致 | s-012 | 二次切换恢复 | 同 |
| B-013 | 撤销条 8s 内可回滚 | blocked（evo-pi 侧未做 → 解除条件：补 `undo` 条 UI，8s 过期策略已在 store 里） | s-013 | 撤销条 UI | 未实现（无撤销条） |
| B-014 | 测试进行中不重复排队 | 一致 | s-014 | 按钮置灰 + 进行中文案 | 同 |
| B-015 | 测试结果按 key 回填对应行 | 一致 | s-015 | 结果贴到对应行 | 同 |
| B-016 | 空态文案可读 | 一致 | s-016 | 引导文案 | 引导 + 路径 + 示例 |
| B-017 | 添加面板打开 | 一致（形态不同：pi-web 是独立面板，我们是空态内联；已记入 spec 决策） | s-017 | 添加表单展开 | 空态内联表单展开 |
| B-018 | 添加成功后刷新列表 | 一致 | s-018 | 落盘后列表出现新项 | 同（选中新项） |
| B-019 | 组头按钮切整组 | 一致 | s-019 | 组头点击切整组 | 同 |
| B-020 | 组批量部分失败逐条回填 | 一致 | s-020 | 失败项单独标红 | 同（`batchSummary` 逐条） |
| B-021 | 批量后组头计数即时更新 | 一致 | s-021 | 计数立刻变 | 同 |
| B-022 | 项目未信任时提示并跳转 | blocked（用户 m04557 决定不迁 → 解除条件：单独立项 trust 能力） | s-022 | 信任对话框 | 未实现（信任能力本轮不迁） |
| B-027 | 发起签到进入等待授权 | blocked（缺签到 UI → 解除条件：接一个"签到"按钮） | s-027 | 签到入口 + 等待态 | 端口/用例已实现，UI 未接 |
| B-028 | 轮询期间显示等待态 | blocked（等待态 UI 未接 → 解除条件：接签到按钮后轮询态可见） | s-028 | 轮询中显示等待 | 同上（store 有 `waiting`） |
| B-029 | 取消签到调用 DELETE | blocked（取消按钮 UI 未接 → 解除条件：签到 UI 落地后调用 `cancel()`） | s-029 | `DELETE /api/mcp/sign-in/[flowId]` | 端口已实现，UI 未接 |
| B-030 | 状态行三态文案互斥 | 一致 | s-030 | ok/fail/running 三种文案 | 同 |
| B-031 | 状态行日志可展开·收起 | 一致 | s-031 | 日志展开 | 同 |
| B-032 | 移除一个 server 后列表与磁盘同步 | 一致（30041 e2e 断言 s-032；30141 该项 UI 为删除按钮） | s-032 | 已删项从列表消失 | 选中清空 |

## 差异分类

| id | 分类 | 说明 |
|---|---|---|
| D-01 | 差异（scope 字面量） | 契约 `McpScope='user'|'project'`，pi-web 用 `global`；UI 文案才叫"用户级"。已在 `contracts/schema.ts` 与 `wire.md` 写明，无需改契约 |
| D-02 | 差异（字段丰富度 + 语义缺口） | pi-web 每行 18 字段 + 顶层 `codemode/files`；evo-pi 5 字段 + `paths`。可及元素 15 vs 12，缺口清单见下节「D-02 量化」——本轮已修两条（行名带状态、组头 switch），其余四项记录在案 |
| D-03 | 差异（cwd 白名单） | pi-web 用 `lib/allowed-roots.ts`（session 根 + `allowFileRoot`）拒绝越界 cwd，返回 `403 cwd-denied`；evo-pi 不做白名单，任意 cwd 都能读 `.pi/mcp.json` → **安全缺口**，列为 C7 之后的独立议题 |
| D-04 | 差异（指令面校验，已修） | 同一 stdio server：pi-web 判 `failed: Invalid entry in MCP tools/list result`（缺 `inputSchema`），evo-pi 曾判 `ok`。已修：夹具补 `inputSchema`，`testStdio` 增加同义校验，现两边一致 |


### D-02 量化（`harness/fidelity.mjs` 的机器结论）

同一份夹具、同一时刻拍"可及元素"（role + 可及名称）：

| 侧 | 可及元素 | 关键语义 |
|---|---|---|
| pi-web | 15 | 信任 `status` 横幅、`信任项目…`、`代码模式：自动`、两组各一个 `switch`（"关闭 全局 中的所有服务器"）、行是 `button` 且名带状态（"alpha：测试时已连接"）、`添加 MCP`、`测试连接`、`移除` |
| evo-pi | 12 | 标题、组 `switch`（"用户级：全部停用"）、行 `li` + 复选框 + `button`（名带状态"alpha：已启用"）、内联添加表单 |

本轮**已按对账结果改进**的两处（不是猜的，是脚本列出来的缺口）：行名补状态后缀、组头改 `role=switch` + `aria-checked`（读屏能说出目标与当前态）。

**仍未对齐（记录，不阻塞）**：① 没有信任状态提示与"信任项目"入口（用户决定信任能力不迁）；② 详情里没有 `测试连接`/`移除` 两个显式动作（我们是输入框 + 开关）；③ 非空态下没有"添加 MCP"入口（只在空态给表单）；④ 没有"代码模式"控制（用户决定不迁）。前两条属于"信息量"，后两条属于"范围砍单"。

## 导航与布局

- pi-web：设置是 **AppShell 内的弹窗（dialog）**，分区切换不换 URL。
- evo-pi：同一约定——`shell/layout/settings-panel.tsx` 是弹窗、MCP 是其中 `mcp` 分区（`panels` 由装配点注入 spec），**没有** `/settings/mcp` 路由。
- 结论：导航形态一致；差异在分区内容（见 D-02）。

## 未对账部分与原因

- B-013 / B-022 / B-027 / B-028 / B-029 共 5 条 `blocked`：都是"pi-web 有 UI、我们这轮没做"的功能，不是数据面差异。
- 数据面与指令面比对结果：`差异 0 条`（`harness/snapshot/parity.json`，exit 0）。

## 保真差异（P7 快照，pi-web 13 / evo-pi 19，覆盖率 77%）

同一份夹具、同一面板，按「aria 角色 + 可及名称」逐条比（剥掉 `：` 后状态后缀，状态差异不算缺失）。

| pi-web 上的元素 | 本仓现状 | 分类 | 说明 |
|---|---|---|---|
| `div:MCP` | `h2:MCP 服务器` | 命名 | pi-web 用 div 当标题，我们用标题元素（读屏更友好，不回退） |
| `button:代码模式：自动`、`select:gamma 的工具如何提供给模型` | 无 | 砍单 | Code mode 本次不迁（`cut-list.md` L1976-L2258） |

