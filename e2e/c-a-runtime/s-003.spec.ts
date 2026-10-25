import { expect, test } from '@playwright/test'
import { waitIdle } from './helpers'

/** B-003 get_state：回包必须带 phase / lastRequestId（界面靠它决定显示"运行中"还是"空闲"）。 */
test('snapshot 回包带 phase 与 lastRequestId', async ({ request }) => {
  const sessionId = `s-003-${Date.now()}`
  await request.post(`/api/agent/${sessionId}`, { data: { command: 'prompt', text: '你好' } })
  const state = await waitIdle(request, sessionId)
  expect(state.lastRequestId).toBeGreaterThan(0)
  expect(typeof state.queued).toBe('number')
})
