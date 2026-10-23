import type { SessionRepositoryPort } from '../domain/ports/session-repository'
import type { SessionSearchResponse } from '../domain/types'

/**
 * makeSearchSessions — factory for UC-SES-03 search-sessions.
 *
 * Pure pass-through to repo.searchSessions. Full-content ponytail scan
 * per pi-web pattern (per plan §7.6). Throws RangeError on query > 200
 * chars (web route maps to 400).
 */
export function makeSearchSessions(deps: {
  repo: SessionRepositoryPort
}): (query: string) => Promise<SessionSearchResponse> {
  return (query: string): Promise<SessionSearchResponse> => deps.repo.searchSessions(query)
}
