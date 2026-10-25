/**
 * @design D-M-02
 * MCP 运行时适配器：把 Host 的"一次性准备"包成端口要求的"准备 + 监视"。
 *
 * 监视用轮询而不是订阅：MCP server 的状态没有推送通道（它们只是子进程），
 * 真实来源就是"再准备一次"。轮询间隔 5s 是权衡——更短会拉起大量子进程探测。
 */
import type { McpRuntime, McpRuntimeState } from '../domain/ports/mcp-runtime'

export function createPollingMcpRuntime({
  prepare,
  intervalMs = 5000,
}: {
  prepare: () => Promise<McpRuntimeState>
  intervalMs?: number
}): McpRuntime {
  return {
    prepare,
    watch(handler) {
      let last = ''
      // 轮询体抽成独立函数：控制流只有一层，nesting ≤ 4（reviewkit 的判据）
      const poll = async (): Promise<void> => {
        const state = await prepare()
        const key = JSON.stringify(state)
        if (key === last) return
        last = key
        handler(state)
      }
      const tick = () => {
        // 监视失败不冒泡：下一轮会再试，抛出去会打断调用方的 effect
        poll().catch(() => {})
      }
      const timer = setInterval(() => void tick(), intervalMs)
      return () => clearInterval(timer)
    },
  }
}
