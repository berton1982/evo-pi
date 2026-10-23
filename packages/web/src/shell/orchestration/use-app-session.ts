/**
 * useSessionContext — PR.B 2B.4 (react-query).
 *
 * Fetches /api/sessions/[id]/context via react-query's useQuery. Returns
 * { data, isLoading, error } matching useSessionList (Phase 1 PR.B) so
 * CenterZone's call site is unchanged.
 *
 * PR.A was useState + useEffect with 100ms simulated delay (mock
 * in-memory). PR.B swaps to react-query so PR.C can swap the route
 * handler to real SDK without touching this hook.
 *
 * queryKey design:
 *   ['session', 'context', sessionId, leafId ?? null, tail ?? 50]
 * Including leafId + tail in the key means option changes re-fetch
 * (matches pi-web useAgentSession behavior at lib/hooks/useAgentSession.ts:790).
 *
 * enabled:false when sessionId is undefined — CenterZone distinguishes
 * "no selection" from "loading" without checking sessionId separately.
 *
 * staleTime: 30_000 — sessions are append-only between calls; 30s
 * tolerance matches typical agent-loop tick interval. PR.C may tune
 * this if create-session mutation needs faster invalidation.
 *
 * retry: 1 — one retry on transient network failure; second failure
 * surfaces to UI for retry button click (Phase 3+ adds Retry via
 * useQuery's refetch; PR.A mock had a disabled Retry button).
 */

'use client'

import { useQuery } from '@tanstack/react-query'

import { fetchApi } from '@/lib/api-client'
import { type SessionContext, SessionContextSchema } from '@/lib/api-types'

export interface UseSessionContextOptions {
  leafId?: string | null
  tail?: number
}

export interface UseSessionContextResult {
  data: SessionContext | undefined
  isLoading: boolean
  error: Error | null
}

const DEFAULT_TAIL = 50

export function useSessionContext(
  sessionId: string | undefined,
  options?: UseSessionContextOptions,
): UseSessionContextResult {
  const leafId = options?.leafId ?? null
  const tail = options?.tail ?? DEFAULT_TAIL

  const query = useQuery<SessionContext, Error>({
    queryKey: ['session', 'context', sessionId, leafId, tail],
    queryFn: async (): Promise<SessionContext> => {
      const params = new URLSearchParams()
      if (leafId != null) params.set('leafId', leafId)
      params.set('tail', String(tail))
      const url = `/api/sessions/${sessionId}/context?${params.toString()}`
      // Route returns { context, tail, before }; extract + validate the inner context.
      const response = await fetchApi<{
        context: SessionContext
        tail: number
        before: string | null
      }>(url)
      return SessionContextSchema.parse(response.context)
    },
    enabled: Boolean(sessionId),
    staleTime: 30_000,
    retry: 1,
  })

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
  }
}
