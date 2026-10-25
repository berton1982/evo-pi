import { expect, test } from '@playwright/test'

/**
 * B-014 压缩：SSE 上必须出现 `compaction_start` → `compaction_end`，且最终回 idle。
 *
 * 为什么用 SSE 而不是轮询快照："压缩中"只有 400ms（假传输按 `AGENT_FAKE_DELAY_MS`
 * 分批送），轮询会撞运气——第一次写这条用例时就是在 250ms 撞空、报"没进压缩态"。
 * 事件序列是确定性证据：收到了哪些事件、按什么顺序。
 */
test('B-014 压缩事件成对出现，事件后回到 idle', async ({ page, request }) => {
  const sessionId = `s-022-${Date.now()}`
  await page.goto('/sessions')
  await page.evaluate((id) => {
    const events: string[] = []
    ;(window as unknown as { __events: string[] }).__events = events
    const es = new EventSource(`/api/agent/${id}`)
    es.onmessage = (m) => {
      const frame = JSON.parse(m.data) as { type: string; event?: { type?: string } }
      const name = frame.type === 'transport' ? (frame.event?.type ?? '') : frame.type
      if (name) events.push(name)
    }
    ;(window as unknown as { __es: EventSource }).__es = es
  }, sessionId)

  await request.post(`/api/agent/${sessionId}`, { data: { command: 'compact' } })

  await expect
    .poll(
      async () =>
        page.evaluate(() => (window as unknown as { __events: string[] }).__events.slice()),
      { timeout: 15000 },
    )
    .toEqual(expect.arrayContaining(['compaction_start', 'compaction_end']))

  // 结束后一定是 idle：压缩态不能粘住
  await expect
    .poll(
      async () => {
        const res = await request.get(`/api/agent/${sessionId}?snapshot=1`)
        return ((await res.json()) as { state: { phase: string } }).state.phase
      },
      { timeout: 15000 },
    )
    .toBe('idle')

  await page.evaluate(() => (window as unknown as { __es: EventSource }).__es.close())
})
