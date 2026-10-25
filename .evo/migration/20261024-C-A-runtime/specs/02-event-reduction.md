# 端到端链路 2：事件流的归约与竞态

### 端到端链路

| 步骤 | 发生什么 | 代码位置 | 可观察结果 |
|---|---|---|---|---|
| 1 | 传输层推来一批事件 | `lib/rpc-manager.ts:843` 之后 | 事件按到达顺序进入同一队列 | `hooks/useAgentSession.ts:387` |
| 2 | 乱序回包按 request id 比较 | `hooks/useAgentSession.ts:387` | 低 id 回包被丢弃，不覆盖更新状态 | `hooks/useAgentSession.ts:364` |
| 3 | 流式 chunk 只写 ref | `hooks/useAgentSession.ts:364` | 不触发整页重渲染（React DevTools 可见 commit 次数） | `hooks/useAgentSession.ts:458` |
| 4 | 会话读 single-flight | `hooks/useAgentSession.ts:458` | 同会话并发读只发一次请求 | `hooks/useAgentSession.ts:2597` |
| 5 | 切换会话时旧结果作废 | `hooks/useAgentSession.ts:2597` | 旧会话的回包不会写进新会话 | `hooks/useAgentSession.ts:387` |
| 6 | 通知溢出策略 | `hooks/useAgentSession.ts:254` | 最多 3 条，第 4 条挤掉最旧的（带退出动画） | `hooks/useAgentSession.ts:364` |

### 决策表

| 决策 | 取值 | 被否方案 | 若判错的代价 | 证据 |
|---|---|---|---|---|
| 幂等键 | `request_id` 单调 + `generation` | 只比时间 | 时钟回拨时会把旧状态当新状态 | `hooks/useAgentSession.ts:458` |
| 流式数据位置 | `useRef` | `useState` | 每帧重渲染，长回答时界面掉帧 | `hooks/useAgentSession.ts:2597` |
| 并发读 | single-flight | 每次调用都发 | 打开会话时打 3–5 个重复请求 | `hooks/useAgentSession.ts:387` |
| 通知容量 | 3 条 + FIFO 挤压 | 无限堆叠 | 连续错误时挡住整个底部区域 | `hooks/useAgentSession.ts:364` |

### 落点

| 单元 | 文件 | 说明 |
|---|---|---|
| 竞态守卫 | `packages/core/src/agent/domain/request-guard.ts` | request id / generation 判定 |
| single-flight | `packages/core/src/agent/domain/single-flight.ts` | 同键合并 |
| 通知队列 | `packages/core/src/agent/domain/notice-queue.ts` | 容量 3 + exiting 态 |


### 测试

测试 ID：`T-02`（C5 落地，C6 对账时校验存在性）。
