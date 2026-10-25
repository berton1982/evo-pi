# C-C 会话面 — 能力规格

> 这份规格是给人看的：用户故事、源码覆盖、交互机制、需要你拍板的 11 件事。
> 签完才进 C4 设计（`humanSignoff` 会拦 agent 代签）。

## 用户故事

| # | 用户故事 | 触发 | 期望结果 |
|---|---|---|---|
| U-01 | 我打开一个已有会话，想接着看上次聊到哪 | 在侧栏选中会话（或 URL 带 `session=`） | 消息按时间顺序出现，滚动位置恢复到我上次离开处，流式/未完成状态如实显示 |
| U-02 | 会话跑飞了，我想立刻叫停 | 点「停止」或按 Esc | 当前轮次中断，已产生的消息保留，界面上更新为已中止状态（不是"失败了"） |
| U-03 | 我想换模型/换推理级别再问一次 | 在工具条选择模型或推理级别 | 选择立即生效于下一轮，历史消息仍显示当时的模型名 |
| U-04 | 我看不清 AI 怎么得出答案，想展开它的思考 | 点消息里的「思考」块 | 思考正文按需加载并展开；再点收起；加载失败只影响这一块 |
| U-05 | AI 改了我的文件，我想看改了什么 | AI 调用 `apply_patch` 后 | 消息里出现左右两栏 diff；无法解析时降级为纯文本 patch |
| U-06 | 会话太长、上下文快满了 | 点「压缩上下文」 | 触发压缩并显示进度，可中断；压缩后继续对话不丢会话 |
| U-07 | 我想把答案复制走 | 悬停在助手消息上点复制 | 写入剪贴板，按钮短暂显示"已复制" |

## 源码覆盖

| 文件 | 行区间 | 覆盖内容 |
|---|---|---|
| `ChatWindow.tsx` | L1-L94 | 导入与 `Props`（40+ 回调）、布局常量 |
| `ChatWindow.tsx` | L95-L165 | `checkAppUpdate`、`NewSessionUpdateLink`（**判归壳级横幅**，见 D-04） |
| `ChatWindow.tsx` | L166-L249 | `hasFinalAssistantAnswer` / `findFinalAssistantIndex` / `getUserInputText` / `ProcessDetailsGroup` |
| `ChatWindow.tsx` | L250-L700 | 容器：首屏三态、消息列表、滚动与位置恢复、搜索定位 |
| `ChatWindow.tsx` | L701-L1100 | 输入工具条状态与 12 个控件动作（发送/中断/模型/推理/工具预设/压缩/提示音/受限/完整历史/标题/系统提示词/工具定义） |
| `ChatWindow.tsx` | L1101-L1520 | 上行回调挂载、通知入队、shell 协同 |
| `ChatWindow.tsx` | L1521-L1664 | `StreamingReply`（流式路径）与 `NoticeShelf` |
| `ChatWindow.tsx` | L1665-L2282 | 扩展 UI 宿主 —— **本次不迁**（砍单，见 `cut-list.md`） |
| `MessageView.tsx` | L1-L159 | token 估算、`SafeMarkdownBody`、大消息揭示 |
| `MessageView.tsx` | L160-L333 | 思考正文异步加载、`Props`、模型名、时间戳、`MessageView` 入口 |
| `MessageView.tsx` | L334-L643 | `UserMessageView`（气泡/展开/编辑/复制） |
| `MessageView.tsx` | L644-L992 | `AssistantMessageView` |
| `MessageView.tsx` | L993-L1150 | `BlockView` / `TextBlock` / `ThinkingBlock` |
| `MessageView.tsx` | L1151-L1344 | `ToolCallBlock`（状态、时长、子代理跳转） |
| `MessageView.tsx` | L1345-L1577 | diff 族（`SplitPatchView` / `SplitDiffCellView` / `PatchTextView`） |
| `MessageView.tsx` | L1578-L2161 | `apply_patch` 解析与其余工具视图 |

## 交互与导航

- **机制：panel**（不是 route）。依据三处：`ref_projects/pi-web/components/AppShell.tsx:1475`（会话主区挂在 AppShell 的 zone 里）、`ref_projects/pi-web/components/AppShell.tsx:2764`（会话切换不改 URL 结构，只换组件内状态）、`packages/web/src/shell/layout/app-layout.tsx:38`（evo-pi 的会话面同样在壳的主区）。
- 会话选择走 URL 的 `?session=`（C-B 负责），本能力只消费 `session` 与 `cwd`；**不新增路由**。
- 扩展 UI（若将来启用）必须走 dialog 层（`dialog-stack`），不允许嵌进消息流——`ref_projects/pi-web/components/ChatWindow.tsx:1698`。

## 人工决策

| # | 决策项 | 结论 | 依据 |
|---|---|---|---|
| 1 | 交互形态 | panel（沿用壳主区，不新增路由） | `AppShell.tsx:1475` |
| 2 | 保真度 | 结构级：可及名与区域对齐，像素不追 | shell 基线已建立的判据 |
| 3 | 不迁范围 | 扩展 UI 宿主 L1665-L2282 | CHARTER 不做清单 1 |
| 4 | CHG 批准权 | `i18n.` 命名空间登记（CHG-003）由你批准 | `contracts/i18n.md` v0.2 |
| 5 | R 级 | R3（`ChatWindow`）+ R2（`MessageView`）合并一次交付 | `GODS.md:43-44` |
| 6 | 运行时边界 | 消息渲染与工具条不留 `node:*`；agent 访问走 C-A 端口 | `ARCHITECTURE.md §1.4` |
| 7 | 新依赖 | 不新增 Markdown/diff 库，沿用现有 | CHARTER 不做清单 3 |
| 8 | i18n 命名空间 | `i18n.*` 通用文案迁入 `common.*` | CHG-003 |
| 9 | 预算 | 单文件 ≤400 行、组件 props ≤6、hook ≤150 行 | `arch/rules.json` |
| 10 | 割接与回滚 | 本能力不割接；C-B 割接时按 `cutover/PLAN.md` 回滚 | 纲领 P4 |
| 11 | 检查点 | C3（本文件）、C4（设计）、C6（对账）三处需要你签字 | `phases.mjs` |

## 与 pi-web 的布局映射

| pi-web 区域 | evo-pi 去向 | 说明 |
|---|---|---|
| 会话主区（消息流） | `packages/web/src/features/chat/chat-surface.tsx` | 壳主区里渲染，滚动容器由 capacity 内部持有 |
| 底部输入区 | `packages/web/src/features/chat/chat-composer.tsx` | 与 C-D 输入区能力的边界：本能力只提供容器与 12 个控件的位置 |
| 顶部工具条 | 壳 `shell/layout/top-bar.tsx` + 本能力回调 | 12 条 blocked 项就在这里落地 |
| 右侧详情面板 | 壳 `detail-pane`（不变） | 文件/diff 详情复用壳右栏 |
| 通知条 | 壳 `shell/layout/notice-shelf.tsx` | 通知队列语义属壳，内容由能力提供 |
