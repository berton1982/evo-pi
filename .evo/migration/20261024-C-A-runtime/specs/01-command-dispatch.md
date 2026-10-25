# 端到端链路 1：一条 prompt 从输入到落盘

### 端到端链路

| 步骤 | 发生什么 | 代码位置 | 可观察结果 |
|---|---|---|---|---|
| 1 | 界面调 `sendPrompt(text)` | `hooks/useAgentSession.ts:342` 返回的 actions | 返回 Promise，未 resolve 前队列显示"排队中" | `hooks/useAgentSession.ts:342` |
| 2 | 申请准入，两并发 prompt 串行 | `lib/rpc-manager.ts:691` `acquirePromptAdmission` | 第二条要等第一条 run 结束才发出 | `lib/rpc-manager.ts:691` |
| 3 | 等扩展绑定完成（首次连上时） | `lib/rpc-manager.ts:606` `waitForExtensionsBound` | 期间发 prompt 会被 hold，不是丢弃 | `lib/rpc-manager.ts:844` |
| 4 | 分发 `prompt` 命令 | `lib/rpc-manager.ts:844` | 请求带 `generation`，旧 generation 的响应被丢弃 | `hooks/useAgentSession.ts:1463` |
| 5 | 事件回流：`message_start` → `message_update*` → `message_end` | `hooks/useAgentSession.ts:1536/1537/1575` | 界面出现一条消息并逐段增长，最后被终态覆盖 | `hooks/useAgentSession.ts:342` |
| 6 | `agent_end` 收尾 | `hooks/useAgentSession.ts:1463` | 队列清空、统计刷新、按钮恢复可用 | `lib/rpc-manager.ts:691` |
| 7 | 落盘 | pi SDK 在 `message_end` 后写 JSONL | 会话文件行数 +N，首行 `{"type":"session","version":3}` | `lib/rpc-manager.ts:844` |

### 决策表

| 决策 | 取值 | 被否方案 | 若判错的代价 | 证据 |
|---|---|---|---|---|
| 准入粒度 | 每会话串行（`acquirePromptAdmission`） | 允许并发 prompt | 同一会话两条 run 交错写事件，消息顺序错乱且无法回滚 | `hooks/useAgentSession.ts:1463` |
| 过期判定 | 以 `generation` 为准，不是时间戳 | 用 timestamps 猜 | fork 后旧响应仍会写入新分支，出现"幽灵消息" | `hooks/useAgentSession.ts:342` |
| 流式合并 | `message_update` 增量合并到同一条 | 每个 chunk 一条消息 | 消息数爆炸，落盘体积翻倍 | `lib/rpc-manager.ts:691` |
| 终态覆盖 | `message_end` 用服务端终态覆盖累积 | 相信本地累积 | 工具输出被截断时界面与文件不一致 | `lib/rpc-manager.ts:844` |

### 落点

| 单元 | 文件 | 说明 |
|---|---|---|
| 命令分发 | `packages/core/src/agent/use-cases/dispatch-command.ts` | 24 个 rpc 命令的入口表（C5 落地） |
| 准入 | `packages/core/src/agent/domain/prompt-admission.ts` | 每会话串行队列 |
| 事件归约 | `packages/core/src/agent/domain/event-reducer.ts` | 纯函数：`(state, event) => state` |


### 测试

测试 ID：`T-01`（C5 落地，C6 对账时校验存在性）。
