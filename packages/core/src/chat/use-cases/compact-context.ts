/**
 * @design D-B-03
 * 压缩上下文：空闲才能发起；压缩进行中再点，按钮语义应变成"停止压缩"（`ChatInput.tsx:2736`）。
 */
import type { AgentTransport } from '../domain/ports/agent-transport'

export interface CompactContextDeps {
  transport: AgentTransport
}

export type CompactResult =
  | { ok: true }
  | { ok: false; error: { code: 'already-running' | 'transport'; message?: string } }

export function createCompactContext(deps: CompactContextDeps) {
  return {
    async compact(sessionId: string, isCompacting: boolean): Promise<CompactResult> {
      if (isCompacting) return { ok: false, error: { code: 'already-running' } }
      const res = await deps.transport.send('compact', { sessionId })
      return res.ok
        ? { ok: true }
        : { ok: false, error: { code: 'transport', message: res.error.message } }
    },
  }
}
