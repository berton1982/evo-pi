'use client'

/**
 * useSessionList — PR.B: real fetch via /api/sessions + react-query.
 *
 * PR.A 阶段：custom hook + setTimeout(100) + 读 mock fixture (per ledger §Task 1A.3).
 * PR.B 阶段：切到 @tanstack/react-query useQuery + fetchApi('/api/sessions') +
 *   ListSessionsResponseSchema.parse + mapDtoToSessionInfo。
 *
 * 返回 shape 与 react-query UseQueryResult 对齐（data / isLoading / error），
 * Sidebar 的 `sessions ?? []` 消费方式无需改（已用过 PR.A）。
 *
 * staleTime：per AppProviders 默认 5min；本 hook 不覆盖（per plan §1B.4）。
 * 后续 phase（如 create-session 后 invalidate）按需调整。
 *
 * PR.C 范围：queryFn 不变；后端切真实 SDK scan。schema 兼容（per Task 1B.2）。
 */

import type { SessionInfo } from '@earendil-works/pi-coding-agent'
import { useQuery } from '@tanstack/react-query'

import { fetchApi } from '@/lib/api-client'
import { ListSessionsResponseSchema, mapDtoToSessionInfo } from '@/lib/api-types'

export const SESSIONS_LIST_QUERY_KEY = ['sessions', 'list'] as const

export function useSessionList(): {
  data: SessionInfo[] | undefined
  isLoading: boolean
  error: Error | null
} {
  const query = useQuery({
    queryKey: SESSIONS_LIST_QUERY_KEY,
    queryFn: async (): Promise<SessionInfo[]> => {
      const response = await fetchApi('/api/sessions')
      const parsed = ListSessionsResponseSchema.parse(response)
      return parsed.sessions.map(mapDtoToSessionInfo)
    },
  })

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
  }
}
