/**
 * useSessionSearch (PR.B 2B.4) — react-query version.
 *
 * Switched from PR.A's useState + useEffect + 200ms debounce to:
 *   useQuery({
 *     queryKey: ['session', 'search', query],
 *     queryFn: fetchApi(`/api/sessions/search?q=${encodeURIComponent(query)}`),
 *     enabled: query.length > 0,
 *     staleTime: 30_000,
 *   })
 *
 * PR.C does not change this hook — only the route handler swaps from
 * mockSearchSessions to real searchSessions use-case (Task 2C.7).
 *
 * Return shape: { data: SessionSearchResponse | undefined, isLoading }
 * — matches PR.A contract. Sidebar's filter logic (which mocks this hook)
 * is unaffected.
 */

// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useSessionSearch } from '@/features/sessions/use-session-search'

function withQueryClient(): ({ children }: { children: ReactNode }) => React.JSX.Element {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0 } },
  })
  return ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

const mockResponse = {
  results: [
    {
      session: {
        path: '/x.jsonl',
        id: 'sess-1',
        cwd: '/c',
        created: '2025-01-01T00:00:00.000Z',
        modified: '2025-01-02T00:00:00.000Z',
        messageCount: 1,
        firstMessage: 'hello',
        allMessagesText: 'hello world',
      },
      entryId: 'e1',
      blockIndex: 0,
      before: 'some context',
      match: 'hello',
      after: 'world',
    },
  ],
  truncated: false,
}

const fetchApiMock = vi.fn()
vi.mock('@/lib/api-client', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    fetchApi: (...args: unknown[]) => fetchApiMock(...args),
  }
})

describe('useSessionSearch (PR.B 2B.4 react-query)', () => {
  beforeEach(() => {
    fetchApiMock.mockReset()
    fetchApiMock.mockResolvedValue(mockResponse)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('does not fetch when query is empty (enabled:false)', () => {
    const { result } = renderHook(() => useSessionSearch(''), { wrapper: withQueryClient() })
    expect(result.current.isLoading).toBe(false)
    expect(result.current.data).toBeUndefined()
    expect(fetchApiMock).not.toHaveBeenCalled()
  })

  it('starts in loading state when query is non-empty', () => {
    const { result } = renderHook(() => useSessionSearch('agent'), {
      wrapper: withQueryClient(),
    })
    expect(result.current.isLoading).toBe(true)
    expect(result.current.data).toBeUndefined()
  })

  it('returns parsed SessionSearchResponse after fetch', async () => {
    const { result } = renderHook(() => useSessionSearch('agent'), {
      wrapper: withQueryClient(),
    })
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
    expect(result.current.data?.results.length).toBe(1)
    expect(result.current.data?.truncated).toBe(false)
  })

  it('encodes query in URL (form encoding: space → +)', async () => {
    renderHook(() => useSessionSearch('hello world'), { wrapper: withQueryClient() })
    await waitFor(() => {
      expect(fetchApiMock).toHaveBeenCalledTimes(1)
    })
    const url = fetchApiMock.mock.calls[0]?.[0] as string
    // URLSearchParams encodes spaces as `+` (form encoding); both `+` and `%20`
    // decode to space on the server side, so either is acceptable. We assert
    // the form-encoded form here.
    expect(url).toContain('q=hello+world')
  })

  it('re-fetches when query changes (new queryKey)', async () => {
    const { rerender, result } = renderHook(({ q }: { q: string }) => useSessionSearch(q), {
      wrapper: withQueryClient(),
      initialProps: { q: 'agent' },
    })
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
    const initialCallCount = fetchApiMock.mock.calls.length
    expect(fetchApiMock.mock.calls[0]?.[0]).toContain('q=agent')

    rerender({ q: 'phase' })
    await waitFor(() => {
      expect(fetchApiMock.mock.calls.length).toBeGreaterThan(initialCallCount)
    })
    const lastUrl = fetchApiMock.mock.calls[fetchApiMock.mock.calls.length - 1]?.[0] as string
    expect(lastUrl).toContain('q=phase')
  })
})
