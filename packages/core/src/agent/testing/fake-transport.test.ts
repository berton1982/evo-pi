import { describe, expect, it } from 'vitest'
import { createFakeTransport } from './fake-transport'

/**
 * 桩自身的行为（T-05）
 * 桩也要有自己的测试：桩错了，用桩写的所有断言都不可信。
 */
describe('fake transport', () => {
  it('prompt 产生 start → delta → end 三段事件，requestId 递增', async () => {
    const t = createFakeTransport({ chunks: ['a', 'b'] })
    const seen: string[] = []
    t.subscribe((e) => seen.push(`${e.requestId}:${e.type}`))
    await t.send('prompt', { text: 'hi' })
    expect(seen).toEqual(['1:message_start', '1:text_delta', '1:text_delta', '1:message_end'])
  })

  it('abort 只发 aborted，不产生正文', async () => {
    const t = createFakeTransport()
    const seen: string[] = []
    t.subscribe((e) => seen.push(e.type))
    await t.send('abort', {})
    expect(seen).toEqual(['aborted'])
  })

  it('failPrompt 让 prompt 失败但命令仍被记录（便于断言"发过没发过"）', async () => {
    const t = createFakeTransport({ failPrompt: true })
    const res = await t.send('prompt', { text: 'x' })
    expect(res.ok).toBe(false)
    expect(t.sent).toHaveLength(1)
  })

  it('delayMs 下事件进队列，drain 后才送达', async () => {
    const t = createFakeTransport({ delayMs: 10 })
    let count = 0
    t.subscribe(() => {
      count += 1
    })
    await t.send('prompt', { text: 'x' })
    expect(count).toBe(0)
    t.drain()
    expect(count).toBeGreaterThan(0)
  })
})
