/**
 * @design D-U-16
 * 会话级状态与准入队列：一个会话在同一时刻只跑一轮。
 *
 * pi-web 用 `flight` + `starting` 两个 ref 表达"正在跑"，再用 `requestId` 判断事件新旧。
 * 这里把它们收敛成纯数据结构：状态可快照、可断言，不依赖 React 生命周期。
 */
export type SessionPhase = 'idle' | 'starting' | 'running' | 'compacting'

export interface SessionState {
  phase: SessionPhase
  /** 最近一次被接受的事件 requestId；更小的一律丢弃（乱序到达的旧事件）。 */
  lastRequestId: number
  /** 本会话串行准入：排队中的提示词。 */
  queued: number
}

export const initialSessionState = (): SessionState => ({
  phase: 'idle',
  lastRequestId: 0,
  queued: 0,
})

/**
 * 只应用"不比我旧"的事件：`requestId` 小于已记录值的一律丢弃。
 *
 * 判据是 `>=` 而不是 `>`：同一轮的所有事件共享一个 `requestId`
 * （`message_start` → `text_delta`… → `message_end`），用 `>` 会把整轮除第一条
 * 之外的增量全当"旧响应"丢掉——单测只数事件条数时看不出来，过 HTTP + SSE 才暴露。
 */
export function acceptEvent(state: SessionState, requestId: number): boolean {
  if (!Number.isFinite(requestId) || requestId < state.lastRequestId) return false
  state.lastRequestId = requestId
  return true
}

/** 运行中提交 → 排队（两种语义：steer 跟随本轮、followUp 排到下一轮）。 */
export function admit(state: SessionState): SessionState {
  if (state.phase === 'running' || state.phase === 'compacting')
    return { ...state, queued: state.queued + 1 }
  return { ...state, phase: 'starting', queued: 0 }
}

/** 一轮结束后把排队数清零并把状态收回 idle。 */
export function finishTurn(state: SessionState): SessionState {
  return { ...state, phase: 'idle', queued: 0 }
}
