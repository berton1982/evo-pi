import { expect, test } from '@playwright/test'

/**
 * agent_start / agent_end：一轮结束必须回到 idle，且 `lastRequestId` 前进。
 *
 * （本文件原来覆盖的是 `clone`；`clone` 是 rpc-manager 的分支复制，属 C-B 的分支导航，
 * 在本能力里没有可观察的副作用，已改由 core 单测覆盖，spec 让位给能端到端验的行为。）
 */
test('prompt 结束后状态回到 idle 且 requestId 前进', async ({ request }) => {
  const sessionId = `s-006-${Date.now()}`
  const before = await request.get(`/api/agent/${sessionId}?snapshot=1`)
  const b = (await before.json()) as { state: { lastRequestId: number; phase: string } }
  expect(b.state.phase).toBe('idle')

  await request.post(`/api/agent/${sessionId}`, { data: { command: 'prompt', text: 'a' } })
  const after = await request.get(`/api/agent/${sessionId}?snapshot=1`)
  const a = (await after.json()) as { state: { lastRequestId: number; phase: string; queued: number } }
  expect(a.state.lastRequestId).toBeGreaterThan(b.state.lastRequestId)
  expect(a.state.phase).toBe('idle')
  expect(a.state.queued).toBe(0)
})
