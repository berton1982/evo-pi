/**
 * @design D-U-09 sendStreamingPrompt / scrollUserMessageToTop
 *
 * 流式追加时只做两件事：把 chunk 拼进"当前这条"，以及决定要不要贴底。
 * 贴底判断复用 `scroll-intent.ts`（D-U-10）——两处各写一遍必然分叉。
 */
import { decideScrollIntent, type ScrollIntent } from './scroll-intent'

export interface StreamChunk {
  text: string
  done?: boolean
}

export function appendChunk(buffer: string, chunk: StreamChunk): string {
  return chunk.text ? `${buffer}${chunk.text}` : buffer
}

export function nextScrollIntent(
  geometry: { scrollHeight: number; scrollTop: number; clientHeight: number },
  current: ScrollIntent,
): ScrollIntent {
  // 用户已经接管（hold）就不再贴底：流式内容每来一段就拽回去，等于不让人读历史
  return decideScrollIntent(geometry, current)
}

/** 用户刚发出的消息要能被看见：把它滚到顶部而不是底部（提问在上面，回复在下面）。 */
export function shouldScrollUserMessageToTop(input: {
  lastMessageRole: 'user' | 'assistant' | null
  streaming: boolean
}): boolean {
  return input.lastMessageRole === 'user' && !input.streaming
}
