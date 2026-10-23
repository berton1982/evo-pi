# 阅读日志 — `McpConfig.tsx`

> 只记"不知道就会改错"的东西。逐行转述没有价值，源码就在那里。

## 阅读日志

| 区间 | 读了什么 | 结论 |
|---|---|---|
| L1-L173 | 导入与类型 | 无直接 `fetch`：动作走 `postMcpAction`/`loadMcpConfig` 之类的类型化封装（在 `@/lib/api-types` 与上层）；20 个 `Config*` 原语来自 `@/components/config/*`；会话状态类型与 `@earendil-works/pi-coding-agent` 的 `McpExposure` 共用 |
| L174-L207 | 五个文案纯函数 | i18n 键全部 `mcp.*`；`failureText` 与 `actionFailureText` 分两级（加载失败 vs 动作失败），迁移时不能合并成一个 |
| L208-L294 | 动作态类型 + `pressedButton()` | `McpActionErrorState` 按 server key 定位错误；焦点回收靠 `pressedButton()` + `focusAfterChange`，是"动作后焦点不许丢"的实现 |
| L295-L831 | 容器状态机 | 19 个 state 分五组：加载（`load`/`refreshing`）、选择（`selected`）、写入（`busy`/`actionError`/`groupStatus`/`undo`/`focusBack`）、测试（`tests`）、签到（`signIns`/`pollRound`）、添加（`adding`/`addDraft`/…）、codemode（`codemodeSave`）；四套并发控制 `requestRef`（加载代次）、`controllerRef`（加载取消）、`saveControllerRef`、`actionControllerRef`、`testRequestsRef`（按 key 去重）、`signInsRef` |
| L832-L1215 | 视图装配 | 三态与空态在这里分支；列表按 scope 分组；详情按 `selected` 装配；`embedded` 控制是否渲染头部 |
| L1216-L1410 | 列表级展示 | 分组标题带 `keptOff` 计数与失败清单；`McpFieldChips`/`McpNameList` 只做列表渲染 |
| L1411-L1711 | 详情面板 | 文件路径行、"在别处覆盖"提示、变量 chips、动作区（开关/移除/登出/测试/签到）；`mcpOverrideNotice`/`mcpVariableChips` 来自 `mcp-server-display`（未迁的 1515 行文件） |
| L1712-L1908 | 状态展示 | stderr 隐藏字符转义后按行输出；测试态四档（running/queued/timed-out/failed）；session 状态与工具清单 |
| L1909-L1975 | 状态行 | 单行的"状态 + 暴露 + 测试结果叠加"，旧的加载结果不能盖住新的测试结果（`mcpWithTestResults`） |
| L1976-L2258 | codemode | 模式偏好（builtin/custom/off）与内联预算两个独立保存动作，各有保存态与失败态；预算非法值有专门文案 |

## 隐式契约（源码没说、但不照做就会改错）

| # | 契约 | 证据 | 违反后果 |
|---|---|---|---|
| 1 | 一次只让一个**写入**在途，但**测试**可以与写入并行 | `busy` 单值；`testRequestsRef` 按 key 去重；注释 "A test writes no file, so it runs beside changes" | 把测试也塞进 `busy` → 用户点测试后按钮全灰，或测到一半被写操作取消 |
| 2 | 后端"拒绝"不等于局部错误：load 失败时整体降级，动作失败只标该行 | `setLoad({state:"failed"})` vs `setActionError({key,…})` | 统一成一个 error → 一个服务器写失败就整页空白 |
| 3 | 后来的加载必须压住先前的加载 | `requestRef.current += 1` + `controllerRef.abort()` | 切项目/刷新竞态时旧数据覆盖新数据 |
| 4 | 卸载时"测试"不 abort，只丢弃回调（路由记账） | 注释 "Tests are let go, never aborted" | abort 掉 → 服务端不再记录测试结果，下次打开看不到 |
| 5 | 签到是**轮询**且由服务端持有流程 | `signIns` + `pollRound` + 定时 effect | 改成一次性请求 → 需要登录的服务器永远显示"未授权" |
| 6 | 添加成功后要"选中 + 立即测一次 + 必要时提示签到 + 把新 trust 交回页面" | `onProjectTrustChanged` 回调注释 | 少做一步，用户加完还得自己找、自己点测 |
| 7 | 选择项跨刷新持久化（`getLastSettingsSelection("mcp", cwd)`） | `useState(() => …)` 初值 + 写入 effect | 刷新后选中项丢失，用户回到列表顶部 |
