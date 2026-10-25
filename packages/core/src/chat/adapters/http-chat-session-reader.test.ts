import { describe, expect, it } from 'vitest'
import { createHttpChatSessionReader, thinkingTextOf } from './http-chat-session-reader'

const jsonResponse = (body: unknown, ok = true): Response =>
  ({ ok, json: async () => body }) as unknown as Response

describe('createHttpChatSessionReader', () => {
  it('readThinking 命中消息时返回思考正文', async () => {
    const reader = createHttpChatSessionReader({
      fetchImpl: (async () =>
        jsonResponse({
          context: {
            messages: [{ id: 'm1', blocks: [{ type: 'thinking', thinking: '想了两步' }] }],
          },
        })) as never,
    })
    expect(await reader.readThinking({ sessionId: 's1', messageId: 'm1' })).toBe('想了两步')
  })

  it('404 与网络异常都返回 null，不抛错', async () => {
    const notFound = createHttpChatSessionReader({
      fetchImpl: (async () => jsonResponse({}, false)) as never,
    })
    expect(await notFound.readThinking({ sessionId: 's', messageId: 'm' })).toBeNull()
    const broken = createHttpChatSessionReader({
      fetchImpl: (async () => {
        throw new Error('boom')
      }) as never,
    })
    expect(await broken.readStats({ sessionId: 's' })).toBeNull()
  })

  it('readStats 只报轮次，token 未知写 0', async () => {
    const reader = createHttpChatSessionReader({
      fetchImpl: (async () =>
        jsonResponse({ context: { messages: [{ id: 'a' }, { id: 'b' }] } })) as never,
    })
    expect(await reader.readStats({ sessionId: 's' })).toEqual({ tokens: 0, turns: 2 })
  })

  it('按 entryIds 定位消息（消息体里没有 id）', async () => {
    const reader = createHttpChatSessionReader({
      fetchImpl: (async () =>
        jsonResponse({
          context: {
            messages: [
              { role: 'user' },
              { role: 'assistant', content: [{ type: 'thinking', thinking: '命中' }] },
            ],
            entryIds: ['e1', 'e2'],
          },
        })) as never,
    })
    expect(await reader.readThinking({ sessionId: 's', messageId: 'e2' })).toBe('命中')
  })

  it('thinkingTextOf 认 content（会话条目的真实形状）', () => {
    expect(thinkingTextOf({ content: [{ type: 'thinking', thinking: '来自 content' }] })).toBe(
      '来自 content',
    )
  })

  it('thinkingTextOf 兼容 text 形状并跳过非思考块', () => {
    expect(
      thinkingTextOf({
        blocks: [
          { type: 'text', text: '正文' },
          { type: 'thinking', text: '想法' },
        ],
      }),
    ).toBe('想法')
    expect(thinkingTextOf({ blocks: [{ type: 'text', text: '正文' }] })).toBeNull()
    expect(thinkingTextOf(null)).toBeNull()
  })
})
