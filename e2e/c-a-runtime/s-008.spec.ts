import { expect, test } from '@playwright/test'

/**
 * auto_compaction_start / end：压缩期间标记 compacting，结束后必须回 idle。
 */
test('compact 期间置 compacting，结束后回 idle', async ({ page, request }) => {
  const sessionId = `s-008-${Date.now()}`
  await page.goto('/')
  const seen = page.evaluate(async (id) => {
    const types: string[] = []
    const es = new EventSource(`/api/agent/${id}`)
    await new Promise<void>((resolve) => {
      es.onmessage = (ev) => {
        const frame = JSON.parse(ev.data) as { type: string; event?: { type: string } }
        if (frame.type === 'transport' && frame.event) types.push(frame.event.type)
        if (types.includes('compaction_end')) {
          es.close()
          resolve()
        }
      }
      setTimeout(() => {
        es.close()
        resolve()
      }, 8000)
    })
    return types
  }, sessionId) as Promise<string[]>

  await page.waitForTimeout(300)
  await request.post(`/api/agent/${sessionId}`, { data: { command: 'compact' } })
  const types = await seen
  expect(types).toContain('compaction_start')
  expect(types).toContain('compaction_end')

  const snap = await request.get(`/api/agent/${sessionId}?snapshot=1`)
  expect(((await snap.json()) as { state: { phase: string } }).state.phase).toBe('idle')
})
