/**
 * CenterZone (PR.B 2B.4) — wired to react-query useSessionContext.
 *
 * PR.A used useSessionContext (useState + useEffect + setTimeout mock);
 * PR.B swapped the hook to react-query useQuery + fetchApi. The
 * CenterZone component itself is unchanged (same return shape) but
 * the tests need to switch from `vi.useFakeTimers + advanceTimersByTime`
 * to `waitFor` + fetchApi mock.
 *
 * 3 states verified:
 *   - undefined sessionId → placeholder (no fetch)
 *   - loading → skeleton (during fetch)
 *   - data → MessageView (after fetch resolves)
 *   - error → error UI (after fetch rejects)
 */

// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/lib/api-client'
import { AppProviders } from '@/shell/frame/providers'

import { CenterZone } from '@/shell/layout/center-pane'

const KNOWN_SESSION_ID = 'ffae836b-9420-4060-ac13-7745215f90ff'
const UNKNOWN_SESSION_ID = '00000000-0000-0000-0000-000000000000'

function withQueryClient(): ({ children }: { children: ReactNode }) => React.JSX.Element {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0 } },
  })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

// 壳不再自带消息渲染器（装配点注入）：测试统一补一个最小替身
const stubRenderer = (): null => null

function renderCenterZone(
  props: Omit<Parameters<typeof CenterZone>[0], 'renderMessages'> & {
    renderMessages?: Parameters<typeof CenterZone>[0]['renderMessages']
  },
): ReturnType<typeof render> {
  const Wrapper = withQueryClient()
  return render(
    <Wrapper>
      <AppProviders>
        <CenterZone renderMessages={stubRenderer} {...props} />
      </AppProviders>
    </Wrapper>,
  )
}

const mockContextResponse = {
  context: {
    messages: [
      { role: 'user', content: [{ type: 'text', text: 'hello, world' }], timestamp: 1733715200000 },
      {
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
      },
    ],
    entryIds: ['e1', 'e2'],
    oldestEntryId: 'e1',
    hasMore: false,
    thinkingLevel: 'off',
    model: { provider: 'anthropic', modelId: 'claude-sonnet-4-5' },
  },
  tail: 50,
  before: null,
}

const fetchApiMock = vi.fn()
vi.mock('@/lib/api-client', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    fetchApi: (...args: unknown[]) => fetchApiMock(...args),
  }
})

describe('CenterZone (PR.B 2B.4 react-query)', () => {
  beforeEach(() => {
    fetchApiMock.mockReset()
    fetchApiMock.mockResolvedValue(mockContextResponse)
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('renders "select or create" placeholder when selectedSessionId is undefined', () => {
    renderCenterZone({ selectedSessionId: undefined })
    expect(screen.getByText(/select.*session|create.*session/i)).toBeInTheDocument()
  })

  it('does not fetch or render MessageView when selectedSessionId is undefined', () => {
    const { container } = renderCenterZone({ selectedSessionId: undefined })
    expect(container.querySelector('[data-component="message-view"]')).toBeNull()
    expect(fetchApiMock).not.toHaveBeenCalled()
  })

  it('renders a skeleton while useSessionContext is loading', () => {
    const { container } = renderCenterZone({ selectedSessionId: KNOWN_SESSION_ID })
    expect(container.querySelector('[data-component="message-view"]')).toBeNull()
    expect(
      container.querySelectorAll('[data-component="message-skeleton"]').length,
    ).toBeGreaterThan(0)
  })

  it('把取到的消息交给注入的渲染器（壳不自己画）', async () => {
    // 显式标注参数类型，否则 vi.fn() 被推断成零参元组
    const renderMessages = vi.fn((_messages: unknown[], _entryIds: (string | undefined)[]) => (
      <div data-testid="injected" />
    ))
    const { container } = renderCenterZone({ selectedSessionId: KNOWN_SESSION_ID, renderMessages })
    await waitFor(() => {
      expect(container.querySelector('[data-testid="injected"]')).not.toBeNull()
    })
    const call = renderMessages.mock.calls[0]
    expect(call).toBeDefined()
    const [messages, entryIds] = call ?? [[], []]
    expect(Array.isArray(messages)).toBe(true)
    expect(messages.length).toBeGreaterThan(0)
    expect(Array.isArray(entryIds)).toBe(true)
  })

  it('renders error UI when fetchApi throws 404', async () => {
    // mockRejectedValue (not Once) so retry:1 also fails — error surfaces
    fetchApiMock.mockRejectedValue(new ApiError('session_not_found', 404))
    const { container } = renderCenterZone({ selectedSessionId: UNKNOWN_SESSION_ID })

    await waitFor(
      () => {
        expect(container.querySelector('[data-component="center-zone-error"]')).not.toBeNull()
      },
      { timeout: 5000 },
    )

    expect(container.querySelector('[data-component="message-view"]')).toBeNull()
  })

  it('uses data-component="center-zone" on the outer section', () => {
    const { container } = renderCenterZone({ selectedSessionId: undefined })
    expect(container.querySelector('[data-component="center-zone"]')).not.toBeNull()
  })
})
