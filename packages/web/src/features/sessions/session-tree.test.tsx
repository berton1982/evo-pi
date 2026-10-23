// @vitest-environment jsdom

import type { SessionInfo } from '@earendil-works/pi-coding-agent'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { SessionTree } from '@/features/sessions/session-tree'
import { SESSION_TREE_ROW_HEIGHT_PX } from '@/features/sessions/session-tree-row'

// Mock @tanstack/react-virtual so tests don't depend on jsdom layout
// (jsdom returns clientHeight=0 → useVirtualizer mounts 0 rows).
// We assert on rendered row semantics, not the virtualization library itself.
vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: (options: { count: number; estimateSize: (index: number) => number }) => {
    const items = Array.from({ length: options.count }, (_, index) => ({
      key: index,
      index,
      start: index * options.estimateSize(index),
      size: options.estimateSize(index),
    }))
    const total = items.reduce((sum, item) => sum + item.size, 0)
    return {
      getTotalSize: () => total,
      getVirtualItems: () => items,
    }
  },
}))

const makeSession = (id: string, name?: string): SessionInfo => ({
  id,
  cwd: '/Users/test/project',
  name,
  created: new Date('2025-01-01T00:00:00Z'),
  modified: new Date('2025-01-02T12:00:00Z'),
  messageCount: 1,
  firstMessage: `first message ${id}`,
  allMessagesText: `first message ${id}`,
  path: `/Users/test/.pi/agent/sessions/${id}.jsonl`,
})

describe('SessionTree', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders zero rows when sessions is empty', () => {
    render(<SessionTree sessions={[]} selectedSessionId={undefined} onSelectSession={() => {}} />)
    expect(screen.queryAllByTestId('session-tree-row')).toHaveLength(0)
  })

  it('renders a row for each session', () => {
    const sessions = [makeSession('a'), makeSession('b'), makeSession('c')]
    render(
      <SessionTree sessions={sessions} selectedSessionId={undefined} onSelectSession={() => {}} />,
    )
    // @tanstack/react-virtual renders only visible rows in jsdom (small viewport).
    // Assert that all three session ids appear as data-session-id somewhere.
    const rows = document.querySelectorAll('[data-component="session-tree-row"]')
    const ids = Array.from(rows).map((r) => r.getAttribute('data-session-id'))
    expect(ids).toEqual(expect.arrayContaining(['a', 'b', 'c']))
  })

  it('calls onSelectSession with the session id when a row is clicked', () => {
    const onSelectSession = vi.fn()
    const sessions = [makeSession('aaa'), makeSession('bbb')]
    render(
      <SessionTree
        sessions={sessions}
        selectedSessionId={undefined}
        onSelectSession={onSelectSession}
      />,
    )
    // Click the button inside the row whose container has data-session-id="bbb"
    const rowB = document.querySelector('[data-session-id="bbb"]')
    expect(rowB).not.toBeNull()
    const button = within(rowB as HTMLElement).getByRole('button')
    fireEvent.click(button)
    expect(onSelectSession).toHaveBeenCalledWith('bbb')
  })

  it('marks the selected row with aria-current="true"', () => {
    const sessions = [makeSession('a'), makeSession('b')]
    render(<SessionTree sessions={sessions} selectedSessionId="b" onSelectSession={() => {}} />)
    const rowB = document.querySelector('[data-session-id="b"]')
    const button = within(rowB as HTMLElement).getByRole('button')
    expect(button.getAttribute('aria-current')).toBe('true')
  })

  it('uses 54px fixed row height (per study #1 §4.1)', () => {
    const sessions = [makeSession('a')]
    render(
      <SessionTree sessions={sessions} selectedSessionId={undefined} onSelectSession={() => {}} />,
    )
    expect(SESSION_TREE_ROW_HEIGHT_PX).toBe(54)
  })

  it('renders without breaking when called with no props (placeholder compat for Sidebar until PR.A.1.6 wires data)', () => {
    // Sidebar still calls <SessionTree /> without props; this should render empty state.
    expect(() => render(<SessionTree />)).not.toThrow()
  })
})
