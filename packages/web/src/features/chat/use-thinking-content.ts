'use client'

import { createHttpChatSessionReader } from '@evo-pi/core/chat'
/**
 * 思考正文的按需加载（`@design D-U-09` 的正文部分 / B-026）。
 *
 * 三条 pi-web 的规矩（`MessageView.tsx:162` 同义）：
 * - **模块级缓存**：同一条消息的思考正文只取一次（展开/收起不该重打接口）
 * - **失败不重试三次**：失败缓存成 `''`，界面显示"没取到"，不无限打
 * - **卸载后不 setState**：用 `cancelled` 标记
 */
import { useEffect, useState } from 'react'

const cache = new Map<string, string>()
const inflight = new Map<string, Promise<string | null>>()

/** 测试用：清缓存 */
export function resetThinkingCache(): void {
  cache.clear()
  inflight.clear()
}

export function useThinkingContent(
  sessionId: string | null,
  messageId: string | undefined,
): {
  text: string | null
  loading: boolean
} {
  const key = sessionId && messageId ? `${sessionId}:${messageId}` : null
  const [text, setText] = useState<string | null>(key ? (cache.get(key) ?? null) : null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!key || !sessionId || !messageId) return
    const cached = cache.get(key)
    if (cached !== undefined) {
      setText(cached)
      return
    }
    let cancelled = false
    setLoading(true)
    const pending =
      inflight.get(key) ?? createHttpChatSessionReader().readThinking({ sessionId, messageId })
    inflight.set(key, pending)
    pending
      .then((value: string | null) => {
        // 失败也写缓存（空串），避免每次展开都重打
        cache.set(key, value ?? '')
        if (!cancelled) setText(value)
      })
      .finally(() => {
        inflight.delete(key)
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [key, messageId, sessionId])

  return { text, loading }
}
