# 阅读日志（C-C 会话面）

> 这段话是给下一个接手的人看的：我读到了什么、哪些是"看起来显然但其实有坑"的地方。

## 阅读日志

| 范围 | 读到什么 |
|---|---|
| `ChatWindow.tsx:48-94` | `Props` 有 40+ 个回调（`onOpenFile` / `onOpenSubagent` / `onContextUsageChange` …），它们是壳与能力的唯一接口；迁的时候要用"分组后的 props 对象"，否则 presenter 立刻反向控制壳 |
| `ChatWindow.tsx:105-165` | `checkAppUpdate` 与 `NewSessionUpdateLink` 是"应用更新提示"，与消息无关，属壳级横幅——C4 要判它到底归壳还是归本能力 |
| `ChatWindow.tsx:166-249` | `hasFinalAssistantAnswer` / `findFinalAssistantIndex` / `getUserInputText` 是三条纯函数，决定"哪条是最终回答"（用于时间戳与时长），边界最容易错 |
| `ChatWindow.tsx:250-1520` | 容器本体：滚动位置、notice 队列、上行回调挂载、输入工具条状态。三段职责混在一个函数里 |
| `ChatWindow.tsx:1521-1664` | `StreamingReply` 用 store 订阅做流式渲染；`NoticeShelf` 有最小高度与暂停逻辑 |
| `MessageView.tsx:43-159` | `estimateTokens` 是 CJK 感知的估算 + 增量缓存；`SafeMarkdownBody` 给 Markdown 包了错误边界 |
| `MessageView.tsx:160-333` | `loadThinkingContent` 异步加载 thinking 正文（带 `thinkingContentCache`），思考内容**不随消息一次到达** |
| `MessageView.tsx:334-1040` | `UserMessageView` / `AssistantMessageView` / `BlockView` 三套渲染；编辑态只在用户消息上生效 |
| `MessageView.tsx:1345-1577` | diff 族是纯展示（`SplitPatchView` / `SplitDiffHeader` / `SplitDiffCellView` / `PatchTextView`），零业务，最适合先迁 |

## 隐式契约

| # | 契约 | 证据 |
|---|---|---|
| 1 | 流式增量与完整消息是**两条渲染路径**，输出必须一致；只迁一条会在真实会话里露 | `ChatWindow.tsx:1521`（`StreamingReply`）vs `MessageView.tsx:288`（`MessageView` 入口） |
| 2 | 「最终回答」不是"最后一条"，要按 `hasFinalAssistantAnswer` 跳过工具结果与中间轮次 | `ChatWindow.tsx:166-182` |
| 3 | 思考正文按需异步取，带缓存与 100 条上限；缓存命中与否不能影响渲染结果 | `MessageView.tsx:93-99`、`:162-190` |
| 4 | token 估算按 CJK 权重估算并增量更新，不能每次全量重算（长会话会卡） | `MessageView.tsx:43-92` |
| 5 | 消息的 `entryId` + `blockIndex` 是定位锚点（跳转/搜索/编辑都用它），渲染层不能自己另造 key | `MessageView.tsx:288` 参数表 |
| 6 | notice 队列有"最小高度/暂停/浮动"三态，暂停期间新 notice 不能顶掉正在读的那条 | `ChatWindow.tsx:1542-1664` |
| 7 | 上行回调（`onSoundToggle` / `onOpenSettings` …）在会话未就绪时可以被调用，必须容忍 | `ChatWindow.tsx:250` 参数默认值 |
| 8 | 扩展 UI 走独立协议，本能力只做 drop，不能"顺手渲染成对话框"——那会与真实协议冲突 | `ChatWindow.tsx:1665-2282` |

## 阅读日志（跨文件：为查证"这一屏上还有谁"而读）

| 文件 | 读到什么 |
|---|---|
| `ref_projects/pi-web/components/AppShell.tsx` | 主区顶栏左侧 6 个入口（信任项目 `:1500`、完整历史 `:1555`、生成标题 `:1624`、分支 `:1753`、系统 `:1770`、工具 `:1807`）与右侧会话信息 `:1860`；新建会话在左侧区顶部，不在主区顶栏 |
| `ref_projects/pi-web/components/ChatInput.tsx` | 主行只有附件 `:2415` + 发送 `:2365`；运行中换成引导 `:2316` / 追加 `:2357`；模型、推理级别、工具预设、压缩→停止压缩 `:2736`、声音、输入历史、停止 agent `:2754` 全在「更多控件」折叠面板 `:2471`；排队撤回 `:1769`；`Alt+Enter` `:2340` |
