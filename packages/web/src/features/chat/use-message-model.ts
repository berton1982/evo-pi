'use client'

/**
 * @design D-U-09
 * 把 store 里的消息映射成"视图能直接画的样子"：分角色、抽文本、标截断。
 *
 * 放 hook 不放组件：同一份派生逻辑被列表与详情两处用，
 * 各写一遍就会出现"列表说截断、详情没截断"。
 */
import { useMemo } from 'react'
import { splitFinalBlocks } from './domain/final-answer'
import type { ChatMessage } from './stores/chat-messages'

export interface MessageModel {
  id: string
  role: 'user' | 'assistant'
  text: string
  answerText: string
  processText: string
  streaming: boolean
  failed: boolean
}

export function useMessageModel(messages: ChatMessage[]): MessageModel[] {
  return useMemo(
    () =>
      messages.map((m) => {
        const blocks = m.blocks ?? []
        const text = blocks
          .map((b) => (b.type === 'text' ? b.text : b.type === 'thinking' ? (b.text ?? '') : ''))
          .join('\n')
          .trim()
        const { answerBlocks, processBlocks } = splitFinalBlocks(
          { content: blocks as never },
          { isStreaming: m.streaming },
        )
        const toText = (list: typeof blocks) =>
          list
            .map((b) => (b.type === 'text' ? b.text : b.type === 'thinking' ? (b.text ?? '') : ''))
            .join('\n')
            .trim()
        return {
          id: m.id,
          role: m.role,
          text,
          answerText: toText(answerBlocks as never),
          processText: toText(processBlocks as never),
          streaming: Boolean(m.streaming),
          failed: false,
        }
      }),
    [messages],
  )
}
