/**
 * MessageView — PR.A 2A.6: render SessionContext.messages as a single column.
 *
 * Per spec §3.9 + plan §2A.6 (Phase 2 minimum):
 *   - user message → left-aligned bubble, plain text
 *   - assistant message → right-aligned bubble + provider/model meta line
 *   - any other role (toolResult, custom, bashExecution, …) → fallback
 *     placeholder showing the role name (Phase 3+ adds typed rendering
 *     for each role)
 *
 * No fork tree, no subagent, no images, no tool-call rendering (Phase 3+).
 *
 * Attribute contract (consumed by PR.D 2D.1 playwright spec):
 *   data-component="message-view"        — container
 *   data-component="message-row"         — each row
 *   data-testid="message-row"            — same row, for @testing-library
 *   data-message-role="<role>"           — for E2E selectors + styling
 *   data-entry-id="<entryId>"            — for test lookups (key reuse)
 *
 * Key strategy: React key = entryIds[i] (already unique per session
 * per plan §2A.1 contract test). Falls back to index if entryIds[i]
 * is missing (defensive — shouldn't happen in practice).
 */

'use client'

import type { AgentMessage, AssistantMessage, UserMessage } from '@/lib/agent-message-types'

interface MessageViewProps {
  messages: AgentMessage[]
  entryIds: string[]
}

/**
 * Extract plain text from a message's content field. Mirrors pi-web
 * MessageView.tsx UserMessageView handling:
 *   - string content → use as-is
 *   - array content → join text blocks (skipping non-text blocks)
 *   - other (toolResult with image, custom binary, …) → empty string
 *
 * Used for the bubble text content. Image / tool-call rendering is
 * Phase 3+ scope.
 */
function extractText(content: unknown): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .filter(
        (b): b is { type: 'text'; text: string } =>
          b !== null &&
          typeof b === 'object' &&
          (b as { type?: unknown }).type === 'text' &&
          typeof (b as { text?: unknown }).text === 'string',
      )
      .map((b) => b.text)
      .join('\n')
  }
  return ''
}

interface MessageRowProps {
  message: AgentMessage
  entryId: string
}

function MessageRow({ message, entryId }: MessageRowProps): React.JSX.Element {
  const role = message.role

  // Common attributes — kept identical for E2E selector parity.
  const baseProps = {
    'data-component': 'message-row',
    'data-testid': 'message-row',
    'data-message-role': role,
    'data-entry-id': entryId,
  }

  if (role === 'user') {
    const userMsg = message as UserMessage
    const text = extractText(userMsg.content)
    return (
      <div {...baseProps} className="flex justify-end">
        <div
          data-component="user-bubble"
          data-slot="bubble"
          className="max-w-[80%] rounded-lg border border-border bg-card px-3 py-2 text-sm"
        >
          <p className="whitespace-pre-wrap">{text}</p>
        </div>
      </div>
    )
  }

  if (role === 'assistant') {
    const assistantMsg = message as AssistantMessage
    const text = extractText(assistantMsg.content)
    return (
      <div {...baseProps} className="flex flex-col items-start gap-1">
        <div
          data-component="assistant-meta"
          data-slot="meta"
          className="text-xs text-muted-foreground"
        >
          {assistantMsg.provider} / {assistantMsg.model}
        </div>
        <div
          data-component="assistant-bubble"
          data-slot="bubble"
          className="max-w-[80%] rounded-lg border border-border bg-accent/40 px-3 py-2 text-sm"
        >
          <p className="whitespace-pre-wrap">{text}</p>
        </div>
      </div>
    )
  }

  // Fallback for toolResult / custom / bashExecution / unknown roles.
  // Phase 3+ will replace with typed rendering per role.
  return (
    <div {...baseProps} className="flex justify-center">
      <div
        data-component="message-fallback"
        data-slot="fallback"
        className="rounded border border-dashed border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground"
      >
        [{role}]
      </div>
    </div>
  )
}

export function MessageView({ messages, entryIds }: MessageViewProps): React.JSX.Element {
  return (
    <div data-component="message-view" className="flex flex-col gap-3 p-4">
      {messages.map((msg, i) => (
        <MessageRow
          key={entryIds[i] ?? `idx-${i}`}
          message={msg}
          entryId={entryIds[i] ?? `idx-${i}`}
        />
      ))}
    </div>
  )
}
