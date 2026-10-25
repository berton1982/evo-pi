/**
 * @design P-A-03
 * MCP 运行时端口：prompt 前准备、连接监视、降级。
 *
 * 为什么单独抽端口：MCP 连接是外部进程，失败是常态（16 个 server 里挂 1 个很正常）。
 * 把"准备失败"和"prompt 失败"混在一个返回值里，UI 就只能显示"发送失败"这一句没用的话。
 */
export interface McpRuntimeState {
  /** 已就绪的 server 名；空数组表示这次 prompt 没有任何 MCP 能力可用。 */
  ready: string[]
  degraded: { name: string; reason: string }[]
}

export interface McpRuntime {
  prepare(sessionId: string, opts?: { cwd?: string }): Promise<McpRuntimeState>
  watch(handler: (state: McpRuntimeState) => void): () => void
}
