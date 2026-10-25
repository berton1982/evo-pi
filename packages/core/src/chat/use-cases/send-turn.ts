/**
 * @design D-B-01
 * 发送一轮消息：空文本拒绝、运行中按 mode 排队、同 clientRequestId 幂等。
 *
 * 为什么这三条必须在用例里而不是组件里：pi-web 的发送按钮与 `Alt+Enter` 走的是
 * 同一条路径（`ChatInput.tsx:2316` / `:2340`），把守卫写进组件就会出现"按钮拦住、
 * 快捷键绕过"的分叉；这是 C-G 试点里"两个入口两套逻辑"的同一个坑。
 */
import type { AgentTransport, PromptPayload, StreamMode } from '../domain/ports/agent-transport'

export interface SendTurnDeps {
  transport: AgentTransport
  /** 已发送过的幂等键（用例内部记账，不依赖组件 state） */
  now?: () => number
}

export interface SendTurnInput extends Omit<PromptPayload, 'mode'> {
  isRunning: boolean
  mode?: StreamMode
}

export type SendTurnResult =
  | { ok: true; mode: StreamMode; requestId?: number }
  | { ok: false; error: { code: 'empty' | 'duplicate' | 'transport'; message?: string } }

export function createSendTurn(deps: SendTurnDeps) {
  const seen = new Map<string, number>()
  const now = deps.now ?? Date.now
  // 幂等窗口只挡"手抖连点/重试"，不挡用户隔一分钟再发同样的话
  const DEDUPE_MS = 2_000

  return {
    async send(input: SendTurnInput): Promise<SendTurnResult> {
      const text = input.text.trim()
      if (!text) return { ok: false, error: { code: 'empty' } }

      const key = input.clientRequestId
      if (key) {
        const last = seen.get(key)
        if (last !== undefined && now() - last < DEDUPE_MS) {
          return { ok: false, error: { code: 'duplicate' } }
        }
        seen.set(key, now())
      }

      // 运行中一律排队，不丢消息也不打断当前轮次——两种语义由调用方选
      const mode: StreamMode = input.isRunning ? (input.mode ?? 'steer') : 'followUp'
      const res = await deps.transport.send('prompt', {
        sessionId: input.sessionId,
        text,
        mode: input.isRunning ? mode : undefined,
        clientRequestId: key,
      })
      if (!res.ok) return { ok: false, error: { code: 'transport', message: res.error.message } }
      return { ok: true, mode, requestId: res.value?.requestId }
    },
  }
}
