/**
 * @design D-B-02
 * @design D-U-13 AgentSessionWrapper 的会话包装（外壳，纯编排）
 * 每会话串行准入：同一会话同时只跑一轮。
 *
 * 为什么需要它：pi-web 的准入逻辑散在 `handleSend`（`useAgentSession.ts:2153`）与
 * `sendStreamingPrompt`（`:2612`）两处，靠 ref 快照判断"是不是正在跑"，于是
 * 双击发送会真的发两次。这里把它变成一次明确的决策：要么发，要么排队。
 */

import type { AgentTransport, StreamMode, TransportOutcome } from '../domain/ports/agent-transport'
import { admit, type SessionState } from '../domain/session-state'

export type AdmissionDecision =
  | { kind: 'sent'; mode: StreamMode; outcome: TransportOutcome }
  | { kind: 'queued'; mode: StreamMode; state: SessionState }

export interface AdmitPromptInput {
  state: SessionState
  transport: AgentTransport
  sessionId: string
  text: string
  /** 调用方显式指定排队语义；不传时运行中默认 `steer`（跟随当前轮次）。 */
  mode?: StreamMode
  clientRequestId?: string
}

export async function admitPrompt({
  state,
  transport,
  sessionId,
  text,
  mode,
  clientRequestId,
}: AdmitPromptInput): Promise<AdmissionDecision> {
  const trimmed = text.trim()
  if (!trimmed) {
    return {
      kind: 'sent',
      mode: mode ?? 'steer',
      outcome: { ok: false, error: { code: 'empty-text' } },
    }
  }
  const running = state.phase === 'running' || state.phase === 'compacting'
  const effective: StreamMode = mode ?? (running ? 'steer' : 'steer')
  if (running) {
    // 运行中不打断：只排队，把 decision 交回 UI（排队行要显示 steer/followUp）
    return { kind: 'queued', mode: effective, state: admit(state) }
  }
  const outcome = await transport.send('prompt', {
    sessionId,
    text: trimmed,
    mode: effective,
    clientRequestId,
  })
  return { kind: 'sent', mode: effective, outcome }
}
