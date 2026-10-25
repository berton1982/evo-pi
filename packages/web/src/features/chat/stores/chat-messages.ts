'use client'

/**
 * @design ST-01
 * 消息列表状态（按 entryId 分片）：只存服务端给的与流式增量，不做展示加工。
 *
 * 为什么用 map 而不是数组：流式增量按 entryId 高频 upsert，
 * 数组要线性找（pi-web 的 2,282 行里 13 处 `findIndex` 就是这么来的）。
 */
import { create } from 'zustand'
import type { ContentBlock } from '../domain/final-answer'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  blocks: ContentBlock[]
  /** 未完成时为 true：此时不显示"截断"之类结论 */
  streaming?: boolean
  ts?: number
  /** 会话文件里的 entry id：消息锚点的一部分（B-041） */
  entryId?: string
  /** 助手消息出错时的原始错误文本（B-038：保留原文，不改写成"出错了"） */
  errorText?: string
}

export interface ChatMessagesState {
  order: string[]
  byId: Record<string, ChatMessage>
  upsert: (message: ChatMessage) => void
  appendText: (id: string, delta: string) => void
  reset: () => void
}

export const useChatMessages = create<ChatMessagesState>((set) => ({
  order: [],
  byId: {},
  upsert: (message) =>
    set((state) => ({
      order: state.order.includes(message.id) ? state.order : [...state.order, message.id],
      byId: { ...state.byId, [message.id]: { ...state.byId[message.id], ...message } },
    })),
  appendText: (id, delta) =>
    set((state) => {
      const current = state.byId[id]
      if (!current) return state
      const blocks = [...current.blocks]
      const last = blocks.at(-1)
      if (last?.type === 'text') blocks[blocks.length - 1] = { ...last, text: last.text + delta }
      else blocks.push({ type: 'text', text: delta })
      return { byId: { ...state.byId, [id]: { ...current, blocks, streaming: true } } }
    }),
  reset: () => set({ order: [], byId: {} }),
}))

/**
 * 按 order 取消息。
 *
 * **不要把它当 zustand 选择器直接传**：它每次返回新数组，`useChatMessages(selectMessages)`
 * 会因引用变化无限重渲染（React error #185）。要么 `useShallow`，要么订阅
 * `order`/`byId` 后在组件里 `useMemo`。
 */
export function selectMessages(state: ChatMessagesState): ChatMessage[] {
  return state.order.map((id) => state.byId[id]).filter((m): m is ChatMessage => Boolean(m))
}
