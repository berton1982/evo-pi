// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useSessionList } from '@/features/sessions/use-session-list'

// Build a QueryClient wrapper per render so each hook gets a clean cache.
function withQueryClient(): ({ children }: { children: ReactNode }) => React.JSX.Element {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0 } },
  })
  return ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

const mockResponse = {
  sessions: [
    {
      path: '/x.jsonl',
      id: 'a',
      cwd: '/x',
      name: 'A',
      created: '2025-01-01T00:00:00.000Z',
      modified: '2025-01-02T00:00:00.000Z',
      messageCount: 1,
      firstMessage: 'hello',
      allMessagesText: 'hello world',
    },
    {
      path: '/y.jsonl',
      id: 'b',
      cwd: '/y',
      created: '2025-01-03T00:00:00.000Z',
      modified: '2025-01-04T00:00:00.000Z',
      messageCount: 2,
      firstMessage: 'second',
      allMessagesText: 'second session',
    },
  ],
  sessionListVersion: 0,
  runningSessionIds: [],
  completionNotificationSuppressedSessionIds: [],
}

// Mock the api-client module to avoid real fetch + control response.
const fetchApiMock = vi.fn()
vi.mock('@/lib/api-client', () => ({
  fetchApi: (...args: unknown[]) => fetchApiMock(...args),
}))

describe('useSessionList (PR.B: react-query)', () => {
  beforeEach(() => {
    fetchApiMock.mockReset()
    fetchApiMock.mockResolvedValue(mockResponse)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('starts in loading state with no data and no error', () => {
    const { result } = renderHook(() => useSessionList(), { wrapper: withQueryClient() })
    expect(result.current.isLoading).toBe(true)
    expect(result.current.data).toBeUndefined()
    expect(result.current.error).toBeNull()
  })

  it('returns parsed SessionInfo[] (ISO string dates → Date objects) after fetch', async () => {
    const { result } = renderHook(() => useSessionList(), { wrapper: withQueryClient() })
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
    expect(result.current.data).toHaveLength(2)
    expect(result.current.data?.[0]?.created).toBeInstanceOf(Date)
    expect(result.current.data?.[0]?.modified).toBeInstanceOf(Date)
  })

  it('calls fetchApi("/api/sessions") exactly once', async () => {
    renderHook(() => useSessionList(), { wrapper: withQueryClient() })
    await waitFor(() => {
      expect(fetchApiMock).toHaveBeenCalledTimes(1)
    })
    expect(fetchApiMock).toHaveBeenCalledWith('/api/sessions')
  })

  it('reports error when fetchApi throws', async () => {
    const fetchError = new Error('network down')
    fetchApiMock.mockRejectedValueOnce(fetchError)
    const { result } = renderHook(() => useSessionList(), { wrapper: withQueryClient() })
    await waitFor(() => {
      expect(result.current.error).toBe(fetchError)
    })
    expect(result.current.data).toBeUndefined()
  })

  it('reports error when response fails schema validation', async () => {
    fetchApiMock.mockResolvedValueOnce({ sessions: [{ invalid: 'shape' }] })
    const { result } = renderHook(() => useSessionList(), { wrapper: withQueryClient() })
    await waitFor(() => {
      expect(result.current.error).toBeInstanceOf(Error)
    })
  })

  it('preserves the optional fields (name, parentSessionPath) when present', async () => {
    fetchApiMock.mockResolvedValueOnce({
      ...mockResponse,
      sessions: [
        {
          ...mockResponse.sessions[0]!,
          parentSessionPath: '/parent.jsonl',
          name: 'Named session',
        },
      ],
    })
    const { result } = renderHook(() => useSessionList(), { wrapper: withQueryClient() })
    await waitFor(() => {
      expect(result.current.data).toHaveLength(1)
    })
    expect(result.current.data?.[0]?.name).toBe('Named session')
    expect(result.current.data?.[0]?.parentSessionPath).toBe('/parent.jsonl')
  })
})
