import { expect, test } from '@playwright/test'

/**
 * B-001 prompt 命令：先申请准入，再交给传输。
 *
 * 这条用例走的是**真链路**：HTTP POST → 运行时准入 → 假传输 → 事件流回写状态。
 * （此前它是 `test.fixme`，因为 `/api/agent` 路由不存在。）
 */
test('prompt 命令：准入后交给传输，状态带 requestId', async ({ request }) => {
  const sessionId = `s-001-${Date.now()}`
  const res = await request.post(`/api/agent/${sessionId}`, {
    data: { command: 'prompt', text: '一致性检查' },
  })
  expect(res.status()).toBe(200)
  const body = (await res.json()) as {
    ok: boolean
    state: { phase: string; lastRequestId: number }
  }
  expect(body.ok).toBe(true)
  // 空文本不发：准入层直接拒
  const empty = await request.post(`/api/agent/${sessionId}`, {
    data: { command: 'prompt', text: '   ' },
  })
  expect(empty.status()).toBe(400)
})

test('prompt 命令：未知 command 被拒', async ({ request }) => {
  const res = await request.post(`/api/agent/x-unknown-${Date.now()}`, {
    data: { command: 'explode' },
  })
  expect(res.status()).toBe(400)
  expect((await res.json()) as { error: string }).toMatchObject({ error: 'invalid-request' })
})
