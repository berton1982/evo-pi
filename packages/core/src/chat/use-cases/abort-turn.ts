/**
 * @design D-B-02
 * 中断当前轮次：只在运行中有意义（点两次不该发两次命令）。
 *
 * 与 `compact-context.ts` 分文件的原因：两者的守卫条件不同（运行态 vs 压缩态），
 * 合并成一个文件会让行级归属无法把两段责任分开——C-G 试点里 `interrupt` 就吃过这个亏。
 */
import type { AgentTransport } from '../domain/ports/agent-transport'

export interface AbortTurnDeps {
  transport: AgentTransport
}

export type AbortResult =
  | { ok: true }
  | { ok: false; error: { code: 'not-running' | 'transport'; message?: string } }

export function createAbortTurn(deps: AbortTurnDeps) {
  return {
    async abort(sessionId: string, isRunning: boolean): Promise<AbortResult> {
      if (!isRunning) return { ok: false, error: { code: 'not-running' } }
      const res = await deps.transport.send('abort', { sessionId })
      return res.ok
        ? { ok: true }
        : { ok: false, error: { code: 'transport', message: res.error.message } }
    },
  }
}
