/**
 * @design D-B-05 prepareMcp：prompt 之前准备 MCP
 *
 * 顺序上的硬约束：MCP 没准备好就发 prompt，模型看不到工具，会答"我没有这些工具"。
 * 失败也**不阻断**发送——降级是明确的产品选择（B-020），所以返回 warning 而不是抛错。
 */
import type { McpRuntime } from '../domain/ports/mcp-runtime'

export interface PreparedMcp {
  tools: readonly string[]
  degraded: readonly { name: string; reason: string }[]
  warning: string | null
}

export function createPrepareMcp(deps: { runtime: McpRuntime }): {
  prepare: (sessionId: string, cwd?: string) => Promise<PreparedMcp>
} {
  return {
    prepare: async (sessionId, cwd) => {
      try {
        const state = await deps.runtime.prepare(sessionId, cwd ? { cwd } : undefined)
        return {
          tools: state.ready,
          degraded: state.degraded,
          // 有 degraded 也照发，但必须留一句能被界面显示的话
          warning: state.degraded.length
            ? `MCP 部分降级：${state.degraded.map((d) => d.name).join('、')}`
            : null,
        }
      } catch (cause) {
        // 端口抛了也不阻断 prompt：整体降级
        return { tools: [], degraded: [], warning: `MCP 未就绪（${String(cause)}），本轮不带工具` }
      }
    },
  }
}
