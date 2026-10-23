/**
 * useSessionContext (PR.B 2B.4) — react-query version.
 *
 * Switched from PR.A's useState+useEffect+setTimeout mock to:
 *   useQuery({
 *     queryKey: ['session', 'context', id, leafId, tail],
 *     queryFn: fetchApi(`/api/sessions/${id}/context?${params}`),
 *     enabled: Boolean(sessionId),
 *     staleTime: 30_000,
 *     retry: 1,
 *   })
 *
 * PR.C does not change this hook — only the route handler (Task 2C.7)
 * swaps from getMockSessionContext to readSessionContext use-case.
 *
 * Return shape: { data: SessionContext | undefined, isLoading, error }
 * — matches useSessionList (Phase 1 PR.B). CenterZone consumer unchanged.
 */

// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/lib/api-client'

import { useSessionContext } from '@/shell/orchestration/use-app-session'

function withQueryClient(): ({ children }: { children: ReactNode }) => React.JSX.Element {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0 } },
  })
  return ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

const KNOWN_SESSION_ID = 'ffae836b-9420-4060-ac13-7745215f90ff'
const UNKNOWN_SESSION_ID = '00000000-0000-0000-0000-000000000000'

const mockContextResponse = {
  context: {
    messages: [
      { role: 'user', content: [{ type: 'text', text: 'hello' }], timestamp: 1733715200000 },
      {
        role: 'assistant',
        content: [{ type: 'text', text: 'Hi!' }],
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

describe('useSessionContext (PR.B 2B.4 react-query)', () => {
  beforeEach(() => {
    fetchApiMock.mockReset()
    fetchApiMock.mockResolvedValue(mockContextResponse)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('does not fetch when sessionId is undefined (enabled:false)', () => {
    const { result } = renderHook(() => useSessionContext(undefined), {
      wrapper: withQueryClient(),
    })
    expect(result.current.isLoading).toBe(false)
    expect(result.current.data).toBeUndefined()
    expect(result.current.error).toBeNull()
    expect(fetchApiMock).not.toHaveBeenCalled()
  })

  it('starts in loading state with no data when sessionId is provided', () => {
    const { result } = renderHook(() => useSessionContext(KNOWN_SESSION_ID), {
      wrapper: withQueryClient(),
    })
    expect(result.current.isLoading).toBe(true)
    expect(result.current.data).toBeUndefined()
    expect(result.current.error).toBeNull()
  })

  it('returns parsed SessionContext.messages after fetch', async () => {
    const { result } = renderHook(() => useSessionContext(KNOWN_SESSION_ID), {
      wrapper: withQueryClient(),
    })
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
    expect(result.current.data?.messages.length).toBe(2)
    expect(result.current.error).toBeNull()
  })

  it('calls fetchApi with the correct URL (no leafId, default tail)', async () => {
    renderHook(() => useSessionContext(KNOWN_SESSION_ID), { wrapper: withQueryClient() })
    await waitFor(() => {
      expect(fetchApiMock).toHaveBeenCalledTimes(1)
    })
    // URLSearchParams order is implementation-defined; just assert the path + presence of tail
    const url = fetchApiMock.mock.calls[0]?.[0] as string
    expect(url).toContain(`/api/sessions/${KNOWN_SESSION_ID}/context`)
    expect(url).toContain('tail=50')
  })

  it('passes leafId + tail options in the URL', async () => {
    renderHook(() => useSessionContext(KNOWN_SESSION_ID, { leafId: 'leaf-1', tail: 10 }), {
      wrapper: withQueryClient(),
    })
    await waitFor(() => {
      expect(fetchApiMock).toHaveBeenCalledTimes(1)
    })
    const url = fetchApiMock.mock.calls[0]?.[0] as string
    expect(url).toContain('leafId=leaf-1')
    expect(url).toContain('tail=10')
  })

  it('reports ApiError when fetchApi throws (e.g. 404)', async () => {
    // mockRejectedValue (not Once) so retry:1 also fails — error surfaces to UI
    fetchApiMock.mockRejectedValue(new ApiError('session_not_found', 404))
    const { result } = renderHook(() => useSessionContext(UNKNOWN_SESSION_ID), {
      wrapper: withQueryClient(),
    })
    // retry:1 means ~1s delay between attempts; allow up to 5s
    await waitFor(
      () => {
        expect(result.current.error).toBeInstanceOf(ApiError)
      },
      { timeout: 5000 },
    )
    expect(result.current.data).toBeUndefined()
    expect((result.current.error as ApiError).status).toBe(404)
  })

  it('switches to a different sessionId and re-fetches', async () => {
    const OTHER_ID = 'd703a1a9-1b7b-4fb1-b512-c9738b1fe617'

    const { result, rerender } = renderHook(
      ({ id }: { id: string | undefined }) => useSessionContext(id),
      { wrapper: withQueryClient(), initialProps: { id: KNOWN_SESSION_ID as string | undefined } },
    )
    await waitFor(() => {
      expect(result.current.data).toBeDefined()
    })
    const initialCallCount = fetchApiMock.mock.calls.length
    expect(fetchApiMock.mock.calls[0]?.[0]).toContain(KNOWN_SESSION_ID)

    // Switch sessionId — queryKey changes, react-query refetches
    rerender({ id: OTHER_ID })
    await waitFor(() => {
      expect(fetchApiMock.mock.calls.length).toBeGreaterThan(initialCallCount)
    })
    const lastCallUrl = fetchApiMock.mock.calls[fetchApiMock.mock.calls.length - 1]?.[0] as string
    expect(lastCallUrl).toContain(OTHER_ID)
  })

  it('clears data when sessionId transitions from defined to undefined', async () => {
    const { result, rerender } = renderHook(
      ({ id }: { id: string | undefined }) => useSessionContext(id),
      { wrapper: withQueryClient(), initialProps: { id: KNOWN_SESSION_ID as string | undefined } },
    )
    await waitFor(() => {
      expect(result.current.data).toBeDefined()
    })

    rerender({ id: undefined })
    await waitFor(() => {
      expect(result.current.data).toBeUndefined()
    })
    expect(result.current.isLoading).toBe(false)
  })

  it('re-fetches when options.tail changes', async () => {
    const { rerender } = renderHook(
      ({ tail }: { tail?: number }) => useSessionContext(KNOWN_SESSION_ID, { tail }),
      { wrapper: withQueryClient(), initialProps: { tail: 3 as number | undefined } },
    )
    await waitFor(() => {
      expect(fetchApiMock).toHaveBeenCalledTimes(1)
    })
    const firstUrl = fetchApiMock.mock.calls[0]?.[0] as string
    expect(firstUrl).toContain('tail=3')

    rerender({ tail: 1 })
    await waitFor(() => {
      expect(fetchApiMock).toHaveBeenCalledTimes(2)
    })
    const secondUrl = fetchApiMock.mock.calls[1]?.[0] as string
    expect(secondUrl).toContain('tail=1')
  })
})
