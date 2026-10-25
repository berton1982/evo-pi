/**
 * @design D-U-07 handleSend / handleModelChange
 *
 * 这里只做编排：**先准入、再分发**。顺序反过来就会出现
 * "排队的消息也发了 prompt"，也就是同一条输入被发两次。
 * 真正的准入规则在 `agent-session.ts`（D-B-02），分发在 `dispatch-command.ts`（D-B-01）。
 */
import type { TransportOutcome } from '../domain/ports/agent-transport'
import type { SessionState } from '../domain/session-state'

export interface SendRequest {
  text: string
  mode?: 'steer' | 'followUp'
  clientRequestId?: string
}

export type SendResult =
  | { kind: 'dispatched'; requestId?: number }
  | { kind: 'queued'; reason: 'running' }
  | { kind: 'rejected'; code: 'empty' | 'send-failed'; message?: string }

export function createSendPrompt(deps: {
  state: () => SessionState
  admit: (text: string) => { dispatched: boolean }
  dispatch: (req: {
    command: 'prompt'
    text: string
    mode?: 'steer' | 'followUp'
    clientRequestId?: string
  }) => Promise<TransportOutcome>
}): { send: (req: SendRequest) => Promise<SendResult> } {
  return {
    send: async (req) => {
      if (!req.text.trim()) return { kind: 'rejected', code: 'empty' }
      const admission = deps.admit(req.text)
      // 运行中：消息进队列，**不发请求**（B-047/B-048 的排队语义）
      if (!admission.dispatched) return { kind: 'queued', reason: 'running' }
      const res = await deps.dispatch({
        command: 'prompt',
        text: req.text,
        mode: req.mode ?? (deps.state().phase === 'running' ? 'steer' : undefined),
        clientRequestId: req.clientRequestId,
      })
      if (!res.ok) return { kind: 'rejected', code: 'send-failed', message: res.error.message }
      return { kind: 'dispatched', requestId: res.value?.requestId }
    },
  }
}
