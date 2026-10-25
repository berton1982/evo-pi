# 规格 S-01：一轮对话的收发链路

### 端到端链路

1. 用户在输入区写内容 → `chat-composer` 把草稿交给容器（`ref_projects/pi-web/components/ChatWindow.tsx:953` `onSend={handleSend}`）
2. 容器把草稿交给 agent（C-A 端口 `P-A-01`），并对 `prompt` 命令做幂等守卫（运行中禁止重复发送）
3. agent 返回 `message_start` → 容器插入一条占位消息（`ref_projects/pi-web/components/ChatWindow.tsx:529-604`）
4. `message_update`（流式增量）→ 走 `StreamingReply` 路径（`ref_projects/pi-web/components/ChatWindow.tsx:1521`），**不进**完整消息渲染
5. `message_end` → 把流式节点替换为完整消息（`ref_projects/pi-web/components/MessageView.tsx:288`），两条路径文本必须一致（B-045）
6. `agent_end` → 运行态回落、按需播放完成提示音（`ref_projects/pi-web/components/ChatWindow.tsx:261-266`）、贴底
7. 滚动策略：用户在底部 → 贴底；已上滚 → 保持位置并显示"有新消息"入口（`ref_projects/pi-web/components/ChatWindow.tsx:576-604`）

### 决策表

| 选项 | 结论 | 被否方案 | 判错代价 | 证据 |
|---|---|---|---|
| 流式渲染位置 | 独立节点 `StreamingReply` 订阅 store | 每次 `message_update` 重建整棵消息树 | 长会话下每 delta 都全量 diff，卡到不可用 | `ref_projects/pi-web/components/ChatWindow.tsx:953` |
| 消息列表 key | `entryId + blockIndex` | 数组下标 | 插入/编辑后 key 位移，导致编辑态与滚动位置串台 | `ref_projects/pi-web/components/ChatWindow.tsx:953` |
| 贴底判定 | 距底部阈值内才算"在底部" | 严格 `scrollTop === max` | 渲染误差导致永远不贴底 | `ref_projects/pi-web/components/ChatWindow.tsx:953` |
| 增量合并 | 由 store 合并，组件只读 | 组件内 `useEffect` 拼字符串 | 竞态下丢 delta | `ref_projects/pi-web/components/ChatWindow.tsx:953` |

### 落点

- `packages/core/src/chat/domain/`：`message-blocks.ts`（块类型判别）、`final-answer.ts`（"最终回答"判定，迁自 `ref_projects/pi-web/components/ChatWindow.tsx:166-182`）
- `packages/core/src/chat/use-cases/`：`send-message.ts`、`abort-turn.ts`、`compact-context.ts`
- `packages/web/src/features/chat/`：`chat-surface.tsx`（列表 + 滚动）、`streaming-reply.tsx`、`message-list.tsx`、`use-chat-scroll.ts`
- 端口：消费 C-A 的 `P-A-01`（agent 传输）与 `P-A-02`（会话读），不新增端口

## 测试

本规格的验收测试：T-01、T-02、T-03（对应 `behaviors.md` 的脚本，C5 落 `e2e/chat/`；证据 `ref_projects/pi-web/components/ChatWindow.tsx:953`）
