# 阅读日志（readlog）

> 读源码时记下**你在读什么、看到了什么**。`readlog` 的作用是把 C4 的判断留在有据可查的地方。

## 阅读日志

| 范围 | 读到了什么 |
|---|---|
| `hooks/useAgentSession.ts:342` | 主 hook 入口：`useAgentSession(opts)` 返回会话视图 + 动作，是全局唯一事件源 |
| `:359` | `Entry ids that took over a run's message keys when the file was read again`（`lib/message-keys.ts` 的接管语义） |
| `:364` | 流式 chunk **不进 React state**（走 `StreamingStore`），否则整块聊天重渲染 |
| `:387` | `Highest request id whose reply was applied`：只应用更高的 request id（乱序回包保护） |
| `:442` | `get_commands` 的 generation：每次请求/清空都前进，只有当前 generation 的回复生效 |
| `:458` | 会话读取 single-flight，key 为 session id（或 `force:<id>`） |
| `:643` | 同一会话的并发读（挂载 + SSE settle + 分页）合并成一次 |
| `:948` | 打开 System/Tools 面板会初始化一个休眠会话——**副作用**，迁移时必须有等价机制 |
| `lib/rpc-manager.ts:299` | `AgentSessionWrapper`（1781 行）：命令分发的中枢，`startRpcSession`/`getRegistry` 是外部入口 |
| `lib/mcp-host.ts:515` | `HostInstance`：MCP server 的启停与工具聚合；本能力只复用 C-G 端口 |
| `lib/subagents.ts:1` | `SUBAGENT_META_TYPE` 到 `readSubagentRun`：frontmatter 解析 + 资源快照 |

## 隐式契约（这块最容易丢）

| 契约 | 证据 | 为什么重要 |
|---|---|---|
| 乱序回包只应用更高 request id | `hooks/useAgentSession.ts:387` | 丢掉会表现为"旧回复覆盖新回复" |
| `get_commands` 按 generation 丢弃过期回复 | `:442` | 丢掉会表现为"切会话后命令表闪回上一个会话的" |
| 流式 chunk 不进 React state | `:364` | 违反会退化成整页重渲染 |
| 会话读 single-flight（同 id 合并） | `:458`, `:643` | 丢掉会重复读盘并抖动 |
| 打开面板会初始化休眠会话 | `:948` | 是**有副作用**的行为，不能当纯 UI |
