'use client'

/**
 * 把真实会话上下文装进 chat store（`GET /api/sessions/[id]/context`）。
 *
 * 这是 e2e 能跑真链路的前提：没有它，会话面只能喂夹具。
 * 三条规矩：
 * - 换会话先 `reset()`：上一条会话的消息留在 store 里会造成"串会话"
 * - 请求带 `tail`：上下文可能上万条，整段拉会卡住渲染
 * - 失败不清空：显示错误但仍保留已有内容（清空等于"用户看到空会话"）
 */
import { useCallback, useEffect, useState } from 'react'
import type { ContentBlock } from './domain/final-answer'
import { type ChatMessage, useChatMessages } from './stores/chat-messages'

interface RawMessage {
  id?: string
  role?: string
  /** 会话条目用的是 `content`（pi SDK 形状），`blocks` 是界面侧叫法 */
  blocks?: ContentBlock[]
  content?: ContentBlock[]
  timestamp?: number
}

/** 把 ContextEntry 的 messages 映射成界面消息（只认 user/assistant） */
export function toChatMessages(messages: readonly RawMessage[]): ChatMessage[] {
  const out: ChatMessage[] = []
  for (const message of messages) {
    if (message.role !== 'user' && message.role !== 'assistant') continue
    const id = message.id ?? `${message.role}-${out.length}`
    out.push({
      id,
      role: message.role,
      blocks: Array.isArray(message.blocks)
        ? message.blocks
        : Array.isArray(message.content)
          ? message.content
          : [],
      ts: message.timestamp,
      entryId: id,
      // 错误消息也进列表（B-038）：不显示的话用户只看到"没有回答"
      errorText: errorTextOf(message),
    })
  }
  return out
}

/**
 * 会话文件里的错误有三种写法（`error` 字符串 / `error.message` / `stopReason`），
 * 统一取一句人话——不显示错误，用户只看到"没有回答"。
 */
function errorTextOf(message: RawMessage): string | undefined {
  const record = message as unknown as {
    /** 直接给的人话错误（我们自己的夹具与部分 pi 会话用这个键） */
    errorText?: string
    error?: string | { message?: string }
    stopReason?: string
  }
  if (typeof record.errorText === 'string' && record.errorText.trim()) return record.errorText
  const raw = record.error
  if (typeof raw === 'string' && raw.trim()) return raw
  if (raw && typeof raw === 'object') {
    const nested = raw.message
    if (typeof nested === 'string' && nested.trim()) return nested
  }
  if (record.stopReason === 'error') return '本轮以错误结束（会话里没有更多细节）'
  return undefined
}

export function useSessionMessages(
  sessionId: string | null,
  tail = 200,
): {
  loading: boolean
  error: string | null
  reload: () => void
} {
  const reset = useChatMessages((state) => state.reset)
  const upsert = useChatMessages((state) => state.upsert)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [_nonce, setNonce] = useState(0)

  useEffect(() => {
    reset()
    if (!sessionId) return
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch(`/api/sessions/${encodeURIComponent(sessionId)}/context?tail=${tail}`)
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const body = (await response.json()) as {
          context?: { messages?: RawMessage[]; entryIds?: (string | undefined)[] }
        }
        const messages = body.context?.messages ?? []
        const entryIds = body.context?.entryIds ?? []
        // 消息体里没有 id，id 在 entryIds 的同一位置——不带上它，
        // 思考正文的按需加载就找不到消息（实测：显示"思考正文没取到"）
        return messages.map((message, index) => ({ ...message, id: message.id ?? entryIds[index] }))
      })
      .then((messages) => {
        if (cancelled) return
        for (const message of toChatMessages(messages)) upsert(message)
      })
      .catch((cause: unknown) => {
        // 失败不清空：用户至少还能看到已经渲染出来的部分
        if (!cancelled) setError(cause instanceof Error ? cause.message : String(cause))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [reset, sessionId, tail, upsert])

  const reload = useCallback(() => {
    setNonce((value) => value + 1)
  }, [])

  return { loading, error, reload }
}
