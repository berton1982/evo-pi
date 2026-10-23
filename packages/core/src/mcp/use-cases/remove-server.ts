import type { McpServerSummary, Outcome } from '../domain/mcp-types'
import type { McpRepository } from '../domain/ports'

/**
 * @design D-B-07
 * 移除一个 server。
 *
 * 为什么要单独一个用例而不是塞进 toggle：移除是**破坏性**动作，调用方必须显式拿到
 * 结果再决定界面怎么收（选中项要清掉、撤销条不该出现）。塞进 toggle 会让"停用"与
 * "删掉"长成同一段代码，误删的风险就藏在那段代码里。
 */
export interface RemoveServer {
  remove(server: McpServerSummary, cwd: string | null): Promise<{ ok: boolean; error?: unknown }>
}

export function createRemoveServer({ repository }: { repository: McpRepository }): RemoveServer {
  return {
    async remove(server, cwd) {
      const res: Outcome<void> = await repository.remove(
        { scope: server.scope, name: server.name },
        cwd,
      )
      if (!res.ok) return { ok: false, error: res.error }
      return { ok: true }
    },
  }
}
