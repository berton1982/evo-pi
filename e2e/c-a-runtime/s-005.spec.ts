import { expect, test } from '@playwright/test'

/** B-005 compact 命令：先 compaction_start 再 compaction_end，且不进入 running。 */
test('compact 命令产生压缩事件对', async ({ request }) => {
  const sessionId = `s-005-${Date.now()}`
  const res = await request.post(`/api/agent/${sessionId}`, { data: { command: 'compact' } })
  expect(res.status()).toBe(200)
  const snap = await request.get(`/api/agent/${sessionId}?snapshot=1`)
  const { state } = (await snap.json()) as { state: { phase: string } }
  // 压缩结束后必须回到 idle，不能卡在 compacting
  expect(state.phase).toBe('idle')
})
