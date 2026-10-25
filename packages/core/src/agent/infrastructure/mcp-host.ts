/**
 * @design D-M-01
 * MCP Host：prompt 前把该会话要用的 server 准备好，失败则降级。
 *
 * 关键决定：**部分失败不阻断 prompt**。16 个 server 里挂 1 个是常态，
 * 直接让"发送"失败等于把别人的故障变成自己的故障；正确做法是带着
 * `degraded` 列表继续，由 UI 决定要不要提示（C-G 的 `integration.md` 也是这个口径）。
 */
import type { McpRuntimeState } from '../domain/ports/mcp-runtime'

export interface McpServerStart {
  name: string
  /** 实际拉起；返回 `{ ok:false }` 表示这个 server 不可用，但整体继续。 */
  start(): Promise<{ ok: true } | { ok: false; reason: string }>
}

export interface McpHostOptions {
  servers: McpServerStart[]
  /** 单个 server 的准备超时；超时按 degraded 处理，不抛。 */
  timeoutMs?: number
}

export function createMcpHost({ servers, timeoutMs = 8000 }: McpHostOptions): {
  prepare(): Promise<McpRuntimeState>
} {
  return {
    async prepare() {
      const ready: string[] = []
      const degraded: { name: string; reason: string }[] = []
      for (const server of servers) {
        let timer: ReturnType<typeof setTimeout> | undefined
        try {
          const result = await Promise.race([
            server.start(),
            new Promise<{ ok: false; reason: string }>((resolve) => {
              timer = setTimeout(
                () => resolve({ ok: false, reason: `准备超时（${timeoutMs}ms）` }),
                timeoutMs,
              )
            }),
          ])
          if (result.ok) ready.push(server.name)
          else degraded.push({ name: server.name, reason: result.reason })
        } catch (error) {
          degraded.push({
            name: server.name,
            reason: error instanceof Error ? error.message : String(error),
          })
        } finally {
          if (timer) clearTimeout(timer)
        }
      }
      return { ready, degraded }
    },
  }
}
