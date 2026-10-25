/**
 * @design D-U-08 handleCompact / handleBuiltinSlashCommand
 *
 * 压缩是"请求后端把上下文收窄"，不是本地删消息：本地删掉、后端不知道，
 * 下一轮回包会把删掉的内容再带回来。所以这里只发命令 + 记一个"压缩中"标记。
 */
import type { AgentTransport, TransportOutcome } from '../domain/ports/agent-transport'

export type CompactResult =
  | { kind: 'started' }
  | { kind: 'rejected'; code: 'already-compacting' | 'send-failed'; message?: string }

export function createCompactContext(deps: {
  transport: AgentTransport
  compacting: () => boolean
}): { compact: () => Promise<CompactResult> } {
  return {
    compact: async () => {
      // 压缩中再点一次不该叠加两次压缩（后端会各压一遍，上下文被压成两段）
      if (deps.compacting()) return { kind: 'rejected', code: 'already-compacting' }
      const res: TransportOutcome = await deps.transport.send('compact', {})
      if (!res.ok) return { kind: 'rejected', code: 'send-failed', message: res.error.message }
      return { kind: 'started' }
    },
  }
}

/** 内置斜杠命令（`/compact` 等）：只有认得的才拦下，其余当普通文本发出去。 */
export const BUILTIN_SLASH_COMMANDS = ['compact'] as const
export type BuiltinSlashCommand = (typeof BUILTIN_SLASH_COMMANDS)[number]

export function isBuiltinSlashCommand(text: string): text is `/${BuiltinSlashCommand}` {
  return (BUILTIN_SLASH_COMMANDS as readonly string[]).some((c) => text.trim() === `/${c}`)
}
