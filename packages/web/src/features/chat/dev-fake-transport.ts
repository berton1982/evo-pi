'use client'

import type { AgentTransport, TransportEvent, TransportOutcome } from '@evo-pi/core/chat'

/**
 * 假传输：只给 e2e 用，绝不在生产路径上被选中。
 *
 * 为什么需要它：C-C 有约 20 条行为只能在"运行中"发生（引导/追加排队、
 * 流式增量、中断、压缩）。没有传输端口就没法在浏览器里造这个状态，
 * 而那些行为只能靠单元测试"声称"实现过。
 *
 * 选中条件是构建期常量 `NEXT_PUBLIC_E2E_FAKE_TRANSPORT=1`
 * （见 `chat-surface.tsx`；e2e 服务用这个变量构建）。
 */
export interface FakeTransportOptions {
  chunkDelayMs?: number
  reply?: string[]
}

export function createFakeTransport(options: FakeTransportOptions = {}): AgentTransport {
  const handlers = new Set<(event: TransportEvent) => void>()
  let requestId = 1000
  const sleep = (ms: number): Promise<void> =>
    new Promise((resolve) => {
      setTimeout(resolve, ms)
    })
  const emit = (type: string, payload: unknown, id: number): void => {
    for (const handler of handlers) handler({ requestId: id, type, payload })
  }

  return {
    async send(command, payload): Promise<TransportOutcome> {
      if (command !== 'prompt') {
        // 中断与压缩只需要让界面知道"结束了"，不需要正文
        emit(command === 'abort' ? 'aborted' : 'compaction_end', {}, requestId)
        return { ok: true }
      }
      requestId += 1
      const id = requestId
      const text = String((payload as { text?: string } | undefined)?.text ?? '')
      const chunks = options.reply ?? ['收到：', text, '。', '这是假传输的回复。']
      // 不 await：send 立刻返回 requestId，正文通过事件流回来（与真实传输同形）
      void (async () => {
        emit('message_start', {}, id)
        for (const chunk of chunks) {
          await sleep(options.chunkDelayMs ?? 900)
          emit('text_delta', { text: chunk }, id)
        }
        emit('message_end', {}, id)
      })()
      return { ok: true, value: { requestId: id } }
    },
    subscribe(handler) {
      handlers.add(handler)
      return () => {
        handlers.delete(handler)
      }
    },
  }
}
