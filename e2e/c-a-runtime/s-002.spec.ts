import { expect, test } from '@playwright/test'

/** B-002 abort 命令：中断当前 run 但保留会话（不清状态）。 */
test('abort 命令：可用且幂等', async ({ request }) => {
  const sessionId = `s-002-${Date.now()}`
  await request.post(`/api/agent/${sessionId}`, { data: { command: 'prompt', text: '长任务' } })
  const res = await request.post(`/api/agent/${sessionId}`, { data: { command: 'abort' } })
  expect(res.status()).toBe(200)
  // 再 abort 一次：不报错（幂等），也不会把状态搞坏
  const again = await request.post(`/api/agent/${sessionId}`, { data: { command: 'abort' } })
  expect(again.status()).toBe(200)
  const snap = await request.get(`/api/agent/${sessionId}?snapshot=1`)
  const { state } = (await snap.json()) as { state: { phase: string } }
  expect(['idle', 'running', 'compacting']).toContain(state.phase)
})
