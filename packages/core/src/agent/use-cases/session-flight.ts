/**
 * @design D-U-03 flight / promoteNewSession
 *
 * 为什么要单独一层：`useAgentSession.ts:364` 之后有一串"正在飞"的标记——
 * 谁的请求在飞、飞的是哪一轮、新会话什么时候被提升成已落盘。
 * 这些标记如果散在组件里，刷新一次就全丢，于是同一个会话会被发起两次读。
 */
export interface Flight {
  sessionId: string
  requestId: number
  startedAt: number
}

export function createFlightTracker(): {
  begin: (sessionId: string, requestId: number, now?: number) => Flight
  end: (sessionId: string) => void
  get: (sessionId: string) => Flight | null
  busy: () => boolean
  isInFlight: (sessionId: string, requestId: number) => boolean
} {
  const flights = new Map<string, Flight>()
  return {
    begin: (sessionId, requestId, now = Date.now()) => {
      const flight = { sessionId, requestId, startedAt: now }
      flights.set(sessionId, flight)
      return flight
    },
    end: (sessionId) => {
      flights.delete(sessionId)
    },
    get: (sessionId) => flights.get(sessionId) ?? null,
    busy: () => flights.size > 0,
    // 只认"当前这一轮"：旧 requestId 的回包不能把新一轮标成结束
    isInFlight: (sessionId, requestId) => flights.get(sessionId)?.requestId === requestId,
  }
}

/** 新会话在第一条消息落盘后"提升"为已落盘会话（isNew 清掉，id 不变）。 */
export function promoteNewSession<T extends { sessionId: string | null; isNew: boolean }>(
  data: T,
  landedSessionId?: string,
): T {
  return { ...data, isNew: false, sessionId: landedSessionId ?? data.sessionId }
}
