// @vitest-environment jsdom

import type { SessionInfo } from '@earendil-works/pi-coding-agent'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { SessionTreeRow } from '@/features/sessions/session-tree-row'

const baseSession: SessionInfo = {
  id: 'sess-1',
  cwd: '/Users/test/project',
  name: 'Test session',
  created: new Date('2025-01-01T00:00:00Z'),
  modified: new Date('2025-01-02T12:00:00Z'),
  messageCount: 7,
  firstMessage: 'hello world',
  allMessagesText: 'hello world',
  path: '/Users/test/.pi/agent/sessions/test.jsonl',
}

describe('SessionTreeRow', () => {
  afterEach(() => {
    cleanup()
  })
  it('renders the session name when present', () => {
    render(<SessionTreeRow session={baseSession} selected={false} onSelect={() => {}} />)
    expect(screen.getByText('Test session')).toBeInTheDocument()
  })

  it('falls back to firstMessage when name is absent', () => {
    const { name: _omitted, ...noName } = baseSession
    render(<SessionTreeRow session={noName as SessionInfo} selected={false} onSelect={() => {}} />)
    // firstMessage truncated to 50 chars in title display (per sessionRowTitle)
    expect(screen.getByText(/hello world/)).toBeInTheDocument()
  })

  it('truncates a long firstMessage to 50 chars + ellipsis', () => {
    const longMessage = 'a'.repeat(80)
    const session = { ...baseSession, name: undefined, firstMessage: longMessage }
    render(<SessionTreeRow session={session as SessionInfo} selected={false} onSelect={() => {}} />)
    // 50 chars + ellipsis (per sessionRowTitle in pi-web)
    const displayed = screen.getByText(/^a{50}\u2026$/)
    expect(displayed).toBeInTheDocument()
  })

  it('shows message count when present', () => {
    render(<SessionTreeRow session={baseSession} selected={false} onSelect={() => {}} />)
    // Locale-formatted via Intl.NumberFormat; assert the count has aria-label
    expect(screen.getByLabelText('7 messages')).toBeInTheDocument()
  })

  it('shows modified time as a short relative label', () => {
    render(
      <SessionTreeRow
        session={{
          ...baseSession,
          // 2 minutes in the past → Intl.RelativeTimeFormat("2 minutes ago" / "2 min. ago")
          modified: new Date(Date.now() - 2 * 60 * 1000),
        }}
        selected={false}
        onSelect={() => {}}
      />,
    )
    // Assert an aria-label with "modified" exists; exact text varies by ICU
    expect(screen.getByLabelText(/modified .+/)).toBeInTheDocument()
  })

  it('exposes cwd via title attribute on the row container', () => {
    const { container } = render(
      <SessionTreeRow session={baseSession} selected={false} onSelect={() => {}} />,
    )
    const row = container.querySelector('[data-component="session-tree-row"]')
    expect(row?.getAttribute('title')).toContain(baseSession.cwd)
  })

  it('calls onSelect when clicked', () => {
    const onSelect = vi.fn()
    render(<SessionTreeRow session={baseSession} selected={false} onSelect={onSelect} />)
    const button = screen.getByRole('button')
    fireEvent.click(button)
    expect(onSelect).toHaveBeenCalledTimes(1)
  })

  it('exposes session id via data-session-id on the container', () => {
    const { container } = render(
      <SessionTreeRow session={baseSession} selected={false} onSelect={() => {}} />,
    )
    const row = container.querySelector('[data-session-id]')
    expect(row?.getAttribute('data-session-id')).toBe('sess-1')
  })

  it('marks the row as selected when selected prop is true', () => {
    render(<SessionTreeRow session={baseSession} selected={true} onSelect={() => {}} />)
    const button = screen.getByRole('button')
    expect(button.getAttribute('aria-current')).toBe('true')
  })

  it('does not mark the row as selected when selected prop is false', () => {
    render(<SessionTreeRow session={baseSession} selected={false} onSelect={() => {}} />)
    const button = screen.getByRole('button')
    expect(button.getAttribute('aria-current')).toBeNull()
  })

  it('renders inside a 54px fixed-height container (per study #1 §4.1)', () => {
    const { container } = render(
      <SessionTreeRow session={baseSession} selected={false} onSelect={() => {}} />,
    )
    const row = container.querySelector('[data-component="session-tree-row"]')
    expect(row).not.toBeNull()
    // Tailwind class for 54px height; vitest+jsdom does not compute layout,
    // so we assert the class is applied (visual height enforced via CSS).
    expect(row?.className).toContain('h-[54px]')
  })
})
