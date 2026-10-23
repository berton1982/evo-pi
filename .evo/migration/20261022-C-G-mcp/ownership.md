# 归属区间 — `ref_projects/pi-web/components/McpConfig.tsx`（2258 行）

## 文件：ref_projects/pi-web/components/McpConfig.tsx

| 行区间 | 归属 | 类型 | 依据 |
|---|---|---|---|
| L1-L173 | D-S-01 | infra | 导入 + 公共类型（`McpConfigLoad`/`McpTestRun`/`McpSignInRun`/`McpAddDraft`/…） |
| L174-L207 | D-U-01 | feature | 文案纯函数：`scopeLabel`/`displayPath`/`noticeText`/`failureText`/`actionFailureText` |
| L208-L294 | D-U-02 | feature | 动作态类型 + `pressedButton()`（焦点回收的唯一入口） |
| L295-L831 | D-U-03 | feature | 容器 `McpConfig`：19 个 state、`refresh`、`testServer`、`runAction`、开关/分组/移除/登出/撤销/添加/codemode 保存 |
| L832-L1215 | D-U-04 | feature | `McpConfigView`：头部/列表/详情的装配与空态、加载、失败三态 |
| L1216-L1410 | D-U-05 | feature | 列表级展示：`McpAddedNoticeView`/`McpCodemodeRow`/`groupStatusText`/`McpServerGroupList`/`McpFieldChips`/`McpNameList` |
| L1411-L1711 | D-U-06 | feature | `McpServerDetail`：单个服务器的详情面板（字段、变量 chips、动作按钮） |
| L1712-L1908 | D-U-07 | feature | 状态展示组：`revealLines`/`testFailureText`/`McpStatusOutput`/`McpStatusLines`/`McpStatusStateWord`/`McpTestStatusLines`/`McpSessionStatusLines`/`McpTestToolList`/`McpTestButton` |
| L1909-L1975 | D-U-08 | feature | `McpStatusRow`：状态行的装配（测试/session/暴露） |
| L1976-L2258 | pi-web Code mode 段（本次不迁，见 cut-list） | drop | codemode 组：`McpCodemodeDetail`/`McpCodemodeSaveFailure`/`McpCodemodeModeRow`/`McpCodemodeInlineBudgetRow` |

合计 **2258 行、9 个区间、无缝（其中 1 段 drop）**（L1 起 L2258 止）。

## 切分说明

1. **容器与展示分离是原文件自己的形状**：`McpConfig`（L295-831）持有全部状态与动作，`McpConfigView`（L832-1215）只接收 props 渲染——迁移时保持这条边界，不把状态散到展示组件里。
2. **`D-U-02` 的 `pressedButton()`** 看起来只有几行，但它是"动作完成后把焦点还给谁"的唯一依据（`focusAfterChange`/`focusIfLost`），属于交互契约，不能顺手塞进展示层。
3. **`D-U-07` 是一组只做格式化与渲染的无状态函数**（9 个），适合先做纯函数单测再接线；`revealLines`/`testFailureText` 可以 1:1 单测。
4. **`D-U-09` codemode 四件套**是独立子流程（模式偏好 + 内联预算），有自己的保存态与失败态，在 C4 会切到独立 store。
5. **没有 drop**：整个文件都是 MCP 面板在用，没有死代码或纯兼容层。
