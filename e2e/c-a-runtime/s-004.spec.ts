import { expect, test } from '@playwright/test'

/**
 * B-004 流式事件：`message_start` → `text_delta`×n → `message_end`，同一轮共享 requestId。
 *
 * 这是 C-A 里**唯一只能端到端验**的契约：单测里假传输同步跑完，
 * 看不到"订阅者通过 SSE 逐条收到"这个事实。
 */
test('SSE 收到完整事件序列，且同一轮 requestId 一致', async ({ page, request }) => {
  const sessionId = `s-004-${Date.now()}`
  // 在页面里用 EventSource 采集（Playwright 的 request API 不支持流式读）
  await page.goto('/')
  const received = page.evaluate(async (id) => {
    const events: Array<{ requestId: number; type: string }> = []
    const es = new EventSource(`/api/agent/${id}`)
    await new Promise<void>((resolve) => {
      es.onmessage = (ev) => {
        const frame = JSON.parse(ev.data) as {
          type: string
          event?: { requestId: number; type: string }
        }
        if (frame.type === 'transport' && frame.event) events.push(frame.event)
        if (events.some((e) => e.type === 'message_end')) {
          es.close()
          resolve()
        }
      }
      setTimeout(() => {
        es.close()
        resolve()
      }, 8000)
    })
    return events
  }, sessionId) as Promise<Array<{ requestId: number; type: string }>>

  // 等订阅建立后再发命令
  await page.waitForTimeout(300)
  await request.post(`/api/agent/${sessionId}`, { data: { command: 'prompt', text: '流式检查' } })

  const events = await received
  const types = events.map((e) => e.type)
  expect(types[0]).toBe('message_start')
  expect(types.filter((t) => t === 'text_delta').length).toBeGreaterThan(0)
  expect(types[types.length - 1]).toBe('message_end')
  // 同一轮共享 requestId（这条就是 `acceptEvent` 用 `<=` 时会挂掉的地方）
  expect(new Set(events.map((e) => e.requestId)).size).toBe(1)
})
