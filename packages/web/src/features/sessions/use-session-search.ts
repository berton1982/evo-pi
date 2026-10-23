/**
 * useSessionSearch — PR.B 2B.4 (react-query).
 *
 * Fetches /api/sessions/search?q=... via react-query's useQuery. Returns
 * { data, isLoading } matching PR.A's contract (Sidebar consumer is
 * unaffected).
 *
 * PR.A was useState + useEffect with 200ms debounce (mock in-memory).
 * PR.B swaps to react-query — react-query's own debounce / dedup
 * logic replaces the hand-rolled debounce. The queryKey includes
 * the query string, so changing the query triggers a new fetch
 * (which react-query dedupes with staleTime: 30_000).
 *
 * enabled: query.length > 0 — empty queries don't fetch, matching
 * the route's empty-query short-circuit (returns empty results
 * without an HTTP call).
 *
 * PR.C does not change this hook — the route handler (Task 2C.7)
 * swaps from mockSearchSessions to the real searchSessions
 * use-case. Same response shape.
 */

'use client'

import { useQuery } from '@tanstack/react-query'

import { fetchApi } from '@/lib/api-client'
import { type SessionSearchResponse, SessionSearchResponseSchema } from '@/lib/api-types'

export interface UseSessionSearchResult {
  data: SessionSearchResponse | undefined
  isLoading: boolean
}

export function useSessionSearch(query: string): UseSessionSearchResult {
  const query_ = useQuery<SessionSearchResponse, Error>({
    queryKey: ['session', 'search', query],
    queryFn: async (): Promise<SessionSearchResponse> => {
      const params = new URLSearchParams({ q: query })
      const url = `/api/sessions/search?${params.toString()}`
      return SessionSearchResponseSchema.parse(await fetchApi<SessionSearchResponse>(url))
    },
    enabled: query.length > 0,
    staleTime: 30_000,
  })

  return {
    data: query_.data,
    isLoading: query_.isLoading,
  }
}
