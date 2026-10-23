import type { SessionEntry } from '@earendil-works/pi-coding-agent'

import type { SessionId } from '../../_shared/domain/session-id'
import type { SessionRepositoryPort } from '../domain/ports/session-repository'

/**
 * makeReadSessionEntries — factory for UC-SES-07 read-session-entries.
 *
 * Pure pass-through to repo.readSessionEntries. Returns defensive copy
 * of all SessionEntry[] in the session. Throws SessionNotFoundError on miss.
 */
export function makeReadSessionEntries(deps: {
  repo: SessionRepositoryPort
}): (sessionId: SessionId) => Promise<SessionEntry[]> {
  return (sessionId: SessionId): Promise<SessionEntry[]> => deps.repo.readSessionEntries(sessionId)
}
