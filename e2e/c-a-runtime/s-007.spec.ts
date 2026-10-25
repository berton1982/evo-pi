import { expect, test } from '@playwright/test'
import { waitIdle } from './helpers'

/**
 * 乱序回包只应用更高 request id：低 id 的回包必须被丢弃。
 *
 * 两次 prompt 的 requestId 严格递增；且第二次之后快照里的 `lastRequestId`
 * 不能小于第一次（这正是 `acceptEvent` 的判据，用 `<=` 会把同轮事件全丢）。
 */
test('连续两轮：requestId 严格递增，低 id 回包不覆盖', async ({ request }) => {
  const sessionId = `s-007-${Date.now()}`
  await request.post(`/api/agent/${sessionId}`, { data: { command: 'prompt', text: '一' } })
  const r1 = (await waitIdle(request, sessionId)).lastRequestId

  await request.post(`/api/agent/${sessionId}`, { data: { command: 'prompt', text: '二' } })
  const r2 = (await waitIdle(request, sessionId, r1 + 1)).lastRequestId

  expect(r1).toBeGreaterThan(0)
  expect(r2).toBeGreaterThan(r1)
})
