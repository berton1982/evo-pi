# 行为规格（C-C 会话面）

> 一行一条可判定行为；证据必须是 `文件:行`；脚本 id 必须在 `harness/registry.json` 登记。

## 行为清单

| id | 说明 | 证据 | script_id |
|---|---|---|---|
| B-001 | 会话区首屏：加载中显示骨架，加载失败显示错误与重试，成功显示消息列表 | `ChatWindow.tsx:300` | s-001 |
| B-002 | 消息列表按 entry 顺序渲染，同一 entry 的多个内容块保持原序 | `ChatWindow.tsx:512` | s-002 |
| B-003 | 流式进行中自动贴底；用户手动上滚后停止自动贴底 | `ChatWindow.tsx:529` | s-003 |
| B-004 | 新消息到达时若用户在底部则贴底，否则保持位置 | `ChatWindow.tsx:576` | s-004 |
| B-005 | 切换会话时按上次记录恢复滚动位置 | `ChatWindow.tsx:614` | s-005 |
| B-006 | 搜索命中时滚动到该消息并高亮，处理完回调 onSearchTargetHandled | `ChatWindow.tsx:657` | s-006 |
| B-007 | "最终回答"判定：跳过工具结果与中间轮次，取最后一条含回答的助手消息 | `ChatWindow.tsx:166` | s-007 |
| B-008 | 用户输入文本提取：取该轮第一条用户消息的正文，用于引用与编辑 | `ChatWindow.tsx:183` | s-008 |
| B-009 | 发送消息：把输入草稿交给 agent，成功后清空草稿并贴底 | `ChatWindow.tsx:296` | s-009 |
| B-010 | 中断：会话运行中发送 abort，运行态回落到空闲 | `ChatWindow.tsx:481` | s-010 |
| B-011 | 改模型：切换后立即对后续轮次生效，历史消息保留原模型名 | `ChatWindow.tsx:296` | s-011 |
| B-012 | 改推理级别：切换后写入会话设置，下次 prompt 生效 | `ChatWindow.tsx:295` | s-012 |
| B-013 | 改工具预设：切换工具集并在下一次运行生效 | `ChatWindow.tsx:295` | s-013 |
| B-014 | 压缩上下文：触发 compact 并显示压缩进度，可中断 | `ChatWindow.tsx:297` | s-014 |
| B-015 | 完成提示音：仅在未中断且开关打开时播放 | `ChatWindow.tsx:261` | s-015 |
| B-016 | 受限模式：打开后隐藏部分高风险入口（工具定义） | `ChatWindow.tsx:88` | s-016 |
| B-017 | 完整历史：切换后加载更早的消息页 | `ChatWindow.tsx:302` | s-017 |
| B-018 | 生成标题：请求模型为当前会话生成标题并回写 | `ChatWindow.tsx:296` | s-018 |
| B-019 | 系统提示词：进入编辑态，保存后影响后续轮次 | `ChatWindow.tsx:296` | s-019 |
| B-020 | 工具定义：展示当前可用工具清单与启用状态 | `ChatWindow.tsx:296` | s-020 |
| B-021 | 通知队列：新通知入队，正在读的那条在暂停期间不被顶掉 | `ChatWindow.tsx:1542` | s-021 |
| B-022 | 通知最大高度受限，超出可滚动；浮动与静态两种模式高度不同 | `ChatWindow.tsx:1543` | s-022 |
| B-023 | 上行回调容错：会话未就绪时调用 onSoundToggle/onOpenSettings 不抛错 | `ChatWindow.tsx:250` | s-023 |
| B-024 | 初始 prompt：外部传入时只消费一次并回调 onInitialPromptConsumed | `ChatWindow.tsx:467` | s-024 |
| B-025 | 静态文本块渲染：Markdown 交给 SafeMarkdownBody | `MessageView.tsx:111` | s-025 |
| B-026 | 思考块：默认折叠，展开时按需异步加载思考正文并缓存 | `MessageView.tsx:162` | s-026 |
| B-027 | 思考块加载中显示占位，加载失败显示错误但不影响其余块 | `MessageView.tsx:162` | s-027 |
| B-028 | 工具调用块：显示工具名、参数摘要与状态（运行中/成功/失败） | `MessageView.tsx:1176` | s-028 |
| B-029 | 工具调用时长：超过最小阈值才显示，优先用结果里的记录值 | `MessageView.tsx:1158` | s-029 |
| B-030 | 子代理工具结果可点击跳转（onOpenSubagent） | `MessageView.tsx:1151` | s-030 |
| B-031 | diff 渲染：apply_patch 结果按文件视角展示左右两栏 | `MessageView.tsx:1364` | s-031 |
| B-032 | patch 文本在无法解析为文件时降级为纯文本视图 | `MessageView.tsx:1508` | s-032 |
| B-033 | 用户消息气泡最大高度受限，超出可展开查看全文 | `MessageView.tsx:160` | s-033 |
| B-034 | 用户消息可编辑：进入编辑态、保存后替换文本并回到只读 | `MessageView.tsx:255` | s-034 |
| B-035 | 复制消息：点击后写入剪贴板并显示"已复制"反馈 | `MessageView.tsx:410` | s-035 |
| B-036 | 助手消息时间戳：仅在配置打开且是"最终回答"时显示 | `MessageView.tsx:242` | s-036 |
| B-037 | 相邻消息时间戳去重：与上一条同分钟时不再显示 | `MessageView.tsx:242` | s-037 |
| B-038 | 错误消息：以警示样式渲染并保留原始错误文本 | `MessageView.tsx:288` | s-038 |
| B-039 | 模型名展示：按 modelNames 映射到显示名，未知模型回退原文 | `MessageView.tsx:223` | s-039 |
| B-040 | token 估算：按 CJK 加权估算并增量更新，不每次全量重算 | `MessageView.tsx:43` | s-040 |
| B-041 | 消息 key 稳定：用 entryId + blockIndex 作锚点，渲染层不自造 key | `MessageView.tsx:288` | s-041 |
| B-042 | 空会话：无消息时显示空态引导 | `ChatWindow.tsx:300` | s-042 |
| B-043 | 横向滚动不出现：长内容在窄屏换行而不撑破容器 | `ChatWindow.tsx:95` | s-043 |
| B-044 | 布局常量：列宽/边距由常量与容器宽度共同决定 | `ChatWindow.tsx:95` | s-044 |
| B-045 | 流式与完整消息渲染一致：同一内容在两条路径下文本相同 | `ChatWindow.tsx:1521` | s-045 |
| B-046 | 无障碍：消息列表为 log 语义，运行态通过 aria-live 播报 | `ChatWindow.tsx:1521` | s-046 |
| B-047 | 运行中输入可排队为「引导（steer）」，在当前响应与其工具调用结束后投递 | `ChatInput.tsx:2316` | s-047 |
| B-048 | 运行中也可排队为「追加（follow-up）」，语义区分于 steer（结束本轮后作为新一轮） | `ChatInput.tsx:2357` | s-048 |
| B-049 | 排队消息以不同颜色行展示，并显示总条数；可一键撤回全部回输入框 | `ChatInput.tsx:1769` | s-049 |
| B-050 | 运行中发送按钮让位给 steer/follow-up；`Alt+Enter` 触发排队投递 | `ChatInput.tsx:2340` | s-050 |
| B-051 | 次要控件收进「更多控件」面板（模型/推理级别/工具预设/压缩/声音/输入历史），可折叠 | `ChatInput.tsx:2471` | s-051 |
| B-052 | 压缩进行中时按钮变成「停止压缩」，可中断 | `ChatInput.tsx:2736` | s-052 |
| B-053 | 附件可添加/移除，发送时随消息一起提交 | `ChatInput.tsx:2415` | s-053 |
| B-054 | 主区顶栏左侧固定六个入口：信任项目（未信任时）/ 完整历史 / 生成标题 / 分支 / 系统提示词 / 工具 | `AppShell.tsx:1555` | s-054 |
| B-055 | 主区顶栏右侧是「会话信息」按钮，点击弹出面板展示当前会话详情（模型/统计/路径） | `AppShell.tsx:1860` | s-055 |
| B-056 | 「新建会话」只在左侧区顶部，不在主区顶栏（避免同一动作两个入口） | `sidebar-header.tsx:52` | s-056 |
| B-057 | 未信任项目时顶栏第一个入口是「信任项目」，信任后消失 | `AppShell.tsx:1500` | s-057 |
