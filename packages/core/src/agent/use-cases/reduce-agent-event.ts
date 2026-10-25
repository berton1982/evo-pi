/**
 * @design D-B-03
 * @design D-U-06 handleAgentEvent 的归约入口
 * 事件归约：把一条传输事件折进会话状态。
 *
 * 为什么是纯函数而不是 hook 里的 if/else 森林：pi-web 的 `handleAgentEvent` 在
 * `useAgentSession.ts:1988` 一口气处理 20+ 种事件，任何一次改动都要通读 200 行；
 * 归约函数只回答"这条事件让状态变成什么"，与 React、与网络都无关，可以直接单测。
 */

import type { TransportEvent } from '../domain/ports/agent-transport'
import { acceptEvent, finishTurn, type SessionState } from '../domain/session-state'

/** 归约后的状态 + 需要外部处理的动作（发送者据此决定要不要通知 UI）。 */
export interface ReduceResult {
  state: SessionState
  /** 被丢弃的旧事件（requestId 不新）；非空时调用方应记录一次计数，别静默。 */
  stale: boolean
  /** 这一轮是否已经结束（用于收尾：清排队、落盘、解除"正在推理"）。 */
  finished: boolean
}

const START_EVENTS = new Set(['message_start', 'turn_start', 'response_start'])
// `compaction_end` 必须算"结束"：少了它，压缩完的状态会永远停在 compacting，
// 之后每次 prompt 都被当成"压缩中"而排队（e2e `s-005`/`s-008` 抓到的就是这个）。
const END_EVENTS = new Set([
  'message_end',
  'turn_end',
  'response_end',
  'done',
  'aborted',
  'compaction_end',
  'auto_compaction_end',
])
const COMPACT_EVENTS = new Set(['auto_compaction_start', 'compaction_start'])

export function reduceAgentEvent(state: SessionState, event: TransportEvent): ReduceResult {
  // 乱序到达的旧事件：`useAgentSession.ts:387` 的语义是"只应用更高的 request id"。
  // 这里同步这个判断，避免旧事件把新一轮的状态盖回去。
  if (!acceptEvent(state, event.requestId)) {
    return { state, stale: true, finished: false }
  }
  if (COMPACT_EVENTS.has(event.type)) {
    return { state: { ...state, phase: 'compacting' }, stale: false, finished: false }
  }
  if (START_EVENTS.has(event.type)) {
    return { state: { ...state, phase: 'running' }, stale: false, finished: false }
  }
  if (END_EVENTS.has(event.type)) {
    return { state: finishTurn(state), stale: false, finished: true }
  }
  // 其它事件（流式增量、工具调用等）不改阶段，只推进 requestId
  return { state, stale: false, finished: false }
}
