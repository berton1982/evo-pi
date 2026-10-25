/**
 * @design P-C-02
 * 会话读的 HTTP 实现：走 evo-pi 自己的 `GET /api/sessions/[id]/context`。
 *
 * 为什么不新开端点：那个端点已经返回整段上下文（`messages[].blocks`），
 * 再开一个 `/messages` 会造出第二条事实源。这里只做"把 HTTP 结果收敛成端口契约"。
 *
 * 契约要点（都是 pi-web 踩过的）：404 → `null`；网络/解析失败 → `null`
 * （读思考正文失败不该让整条消息渲染挂掉）。
 */
import type { ChatSessionReader } from '../domain/ports/chat-session-reader'

export interface HttpChatSessionReaderDeps {
  baseUrl?: string
  fetchImpl?: typeof fetch
}

interface ContextResponse {
  /** `entryIds` 与 `messages` 同位置：消息体里没有 id，id 在 entryIds 里 */
  context?: { messages?: unknown[]; entryIds?: (string | undefined)[] }
}

type Block = { type?: string; text?: string; thinking?: string }

/**
 * 从一条消息的 blocks 里取思考正文。
 *
 * `blocks` 是界面侧叫法，会话条目实际用 `content`——两个都要认，
 * 只认 `blocks` 会让"思考正文永远取不到"（实测踩过）。
 */
export function thinkingTextOf(message: unknown): string | null {
  const raw = message as { blocks?: Block[]; content?: Block[] } | null
  const blocks = raw?.blocks ?? raw?.content
  if (!Array.isArray(blocks)) return null
  const parts: string[] = []
  for (const block of blocks) {
    if (block?.type !== 'thinking') continue
    if (typeof block.thinking === 'string') parts.push(block.thinking)
    else if (typeof block.text === 'string') parts.push(block.text)
  }
  return parts.length > 0 ? parts.join('\n\n') : null
}

export function createHttpChatSessionReader(
  deps: HttpChatSessionReaderDeps = {},
): ChatSessionReader {
  const baseUrl = deps.baseUrl ?? ''
  const doFetch = deps.fetchImpl ?? fetch

  async function readContext(sessionId: string): Promise<ContextResponse | null> {
    try {
      const response = await doFetch(
        `${baseUrl}/api/sessions/${encodeURIComponent(sessionId)}/context`,
      )
      if (!response.ok) return null
      return (await response.json()) as ContextResponse
    } catch {
      return null
    }
  }

  return {
    async readThinking({ sessionId, messageId }) {
      const body = await readContext(sessionId)
      const messages = body?.context?.messages
      if (!Array.isArray(messages)) return null
      const entryIds = body?.context?.entryIds ?? []
      const index = messages.findIndex(
        (m, i) => (m as { id?: string })?.id === messageId || entryIds[i] === messageId,
      )
      return index >= 0 ? thinkingTextOf(messages[index]) : null
    },

    async readStats({ sessionId }) {
      const body = await readContext(sessionId)
      const messages = body?.context?.messages
      if (!Array.isArray(messages)) return null
      // token 需服务端统计：未知就写 0，不编数字
      return { tokens: 0, turns: messages.length }
    },
  }
}
