/**
 * MessageView (PR.A 2A.6) — render-against-SessionContext contract test.
 *
 * Per spec §3.9 + plan §2A.6:
 *   Renders a single-column message list for SessionContext.messages.
 *   - user messages: left-aligned bubble
 *   - assistant messages: right-aligned bubble + provider/model meta
 *   - non-{user,assistant} messages (toolResult, custom, bashExecution):
 *     render a fallback placeholder showing the role name (Phase 3+
 *     typed rendering is out of scope)
 *
 * Test attribute contract (per plan §2D.1):
 *   data-component="message-row"
 *   data-message-role="user" | "assistant" | <fallback-role-string>
 *   data-entry-id="<entryId>"
 *
 * The hook (useSessionContext, 2A.4) supplies messages + entryIds in
 * parallel arrays; MessageView uses entryIds[i] as the React key.
 */

import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { MessageView } from '@/features/sessions/message-view'
import type { AgentMessage } from '@/lib/agent-message-types'

// @vitest-environment jsdom

function textOf(content: unknown): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .map((b) =>
        b && typeof b === 'object' && (b as { type?: unknown }).type === 'text'
          ? (b as { text: string }).text
          : '',
      )
      .join('')
  }
  return ''
}

const userMsg1: AgentMessage = {
  role: 'user',
  content: [{ type: 'text', text: 'hello, world' }],
  timestamp: 1733715200000,
}
const assistantMsg1: AgentMessage = {
  role: 'assistant',
  content: [{ type: 'text', text: 'Hi! How can I help?' }],
  api: 'anthropic-messages',
  provider: 'anthropic',
  model: 'claude-sonnet-4-5',
  usage: {
    input: 100,
    output: 50,
    cacheRead: 0,
    cacheWrite: 0,
    totalTokens: 150,
    cost: { input: 0.0003, output: 0.00075, cacheRead: 0, cacheWrite: 0, total: 0.00105 },
  },
  stopReason: 'stop',
  timestamp: 1733715205000,
}
const userMsg2: AgentMessage = {
  role: 'user',
  content: [{ type: 'text', text: 'what is pi?' }],
  timestamp: 1733715210000,
}
const assistantMsg2: AgentMessage = {
  role: 'assistant',
  content: [{ type: 'text', text: 'pi is a coding agent harness.' }],
  api: 'anthropic-messages',
  provider: 'anthropic',
  model: 'claude-sonnet-4-5',
  usage: {
    input: 200,
    output: 80,
    cacheRead: 0,
    cacheWrite: 0,
    totalTokens: 280,
    cost: { input: 0.0006, output: 0.0012, cacheRead: 0, cacheWrite: 0, total: 0.0018 },
  },
  stopReason: 'stop',
  timestamp: 1733715218000,
}
const toolResultMsg: AgentMessage = {
  role: 'toolResult',
  toolName: 'bash',
  toolCallId: 'call-1',
  content: [{ type: 'text', text: 'ls: cannot access foo: No such file' }],
  isError: false,
  timestamp: 1733715221000,
} as unknown as AgentMessage

describe('MessageView (PR.A 2A.6)', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders a row for each message with the expected data-* attributes', () => {
    const { container } = render(
      <MessageView
        messages={[userMsg1, assistantMsg1, userMsg2, assistantMsg2]}
        entryIds={['e1', 'e2', 'e3', 'e4']}
      />,
    )
    const rows = container.querySelectorAll('[data-component="message-row"]')
    expect(rows.length).toBe(4)
    expect(rows[0]?.getAttribute('data-message-role')).toBe('user')
    expect(rows[1]?.getAttribute('data-message-role')).toBe('assistant')
    expect(rows[2]?.getAttribute('data-message-role')).toBe('user')
    expect(rows[3]?.getAttribute('data-message-role')).toBe('assistant')
  })

  it('attaches entry IDs to rows via data-entry-id', () => {
    const { container } = render(
      <MessageView messages={[userMsg1, assistantMsg1]} entryIds={['entry-1', 'entry-2']} />,
    )
    const rows = container.querySelectorAll('[data-component="message-row"]')
    expect(rows[0]?.getAttribute('data-entry-id')).toBe('entry-1')
    expect(rows[1]?.getAttribute('data-entry-id')).toBe('entry-2')
  })

  it('renders user text content as readable text (per spec §3.9)', () => {
    render(<MessageView messages={[userMsg1]} entryIds={['e1']} />)
    expect(screen.getByText(textOf(userMsg1.content))).toBeInTheDocument()
  })

  it('renders assistant text content + provider/model meta', () => {
    const { container } = render(<MessageView messages={[assistantMsg1]} entryIds={['e1']} />)
    expect(screen.getByText(textOf(assistantMsg1.content))).toBeInTheDocument()
    // Provider + model shown together (per spec §3.9 — "metadata: api/provider/model")
    expect(container.textContent).toContain('anthropic')
    expect(container.textContent).toContain('claude-sonnet-4-5')
  })

  it('renders toolResult messages as a fallback placeholder (Phase 3+ for typed)', () => {
    const { container } = render(<MessageView messages={[toolResultMsg]} entryIds={['e1']} />)
    const row = container.querySelector('[data-component="message-row"]')
    expect(row?.getAttribute('data-message-role')).toBe('toolResult')
    // Fallback shows the role name as a placeholder
    expect(container.textContent).toContain('toolResult')
  })

  it('renders an empty list for empty messages array (no rows)', () => {
    const { container } = render(<MessageView messages={[]} entryIds={[]} />)
    const rows = container.querySelectorAll('[data-component="message-row"]')
    expect(rows.length).toBe(0)
  })

  it('renders fallback for unknown roles without crashing', () => {
    const unknownRole = { role: 'somethingUnknown', content: 'noop' } as unknown as AgentMessage
    const { container } = render(<MessageView messages={[unknownRole]} entryIds={['e1']} />)
    const row = container.querySelector('[data-component="message-row"]')
    expect(row?.getAttribute('data-message-role')).toBe('somethingUnknown')
  })

  it('renders all rows inside a message-view container', () => {
    const { container } = render(<MessageView messages={[userMsg1]} entryIds={['e1']} />)
    const view = container.querySelector('[data-component="message-view"]')
    expect(view).not.toBeNull()
    const rows = within(view as HTMLElement).queryAllByTestId('message-row')
    expect(rows.length).toBe(1)
  })
})
