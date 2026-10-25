import { type APIRequestContext, expect } from '@playwright/test'

/**
 * 运行时的可观察状态：`/api/agent/[id]?snapshot=1`。
 *
 * 为什么要轮询而不是直接读一次：假传输按 `AGENT_FAKE_DELAY_MS` 分批送事件
 * （默认 400ms/serve.sh 里设的），POST 返回时这一轮往往还没跑完。
 * 早先这些断言"一次就过"，是因为当时 `delayMs=0` 让事件同步送达——
 * 也就是说它们验的是"同步"这个巧合，不是"最终状态"。
 */
export interface RuntimeSnapshot {
  phase: 'idle' | 'starting' | 'running' | 'compacting'
  lastRequestId: number
  queued: number
}

export async function snapshot(
  request: APIRequestContext,
  sessionId: string,
): Promise<RuntimeSnapshot> {
  const res = await request.get(`/api/agent/${sessionId}?snapshot=1`)
  const body = (await res.json()) as { state: RuntimeSnapshot }
  return body.state
}

/**
 * 等到"这一轮收尾"再断言。
 *
 * 判据必须是 `phase === 'idle' && lastRequestId > 0`：新会话的初始态就是 idle，
 * 只等 idle 会立刻返回（`lastRequestId` 还是 0），断言就变成"验了个空"。
 */
export async function waitIdle(
  request: APIRequestContext,
  sessionId: string,
  minRequestId = 1,
  timeout = 30000,
): Promise<RuntimeSnapshot> {
  await expect
    .poll(
      async () => {
        const s = await snapshot(request, sessionId)
        // 既要收尾、又要这一轮真的跑过：`lastRequestId >= minRequestId`
        // 让"第二轮"能等到自己那一轮，而不是立刻读到第一轮的结果。
        return s.phase === 'idle' && s.lastRequestId >= minRequestId
      },
      { timeout },
    )
    .toBe(true)
  return snapshot(request, sessionId)
}
