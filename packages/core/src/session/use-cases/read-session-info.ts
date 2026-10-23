import type { SessionInfo } from '@earendil-works/pi-coding-agent'

import type { SessionId } from '../../_shared/domain/session-id'
import type { SessionRepositoryPort } from '../domain/ports/session-repository'

/**
 * makeReadSessionInfo — factory for UC-SES-05 read-session-info.
 *
 * Returns SessionInfo | null (legacy null-on-miss contract — used by
 * Phase 1 readSessionInfo use-case; Phase 2 read-side use-cases throw
 * SessionNotFoundError instead). Kept as Phase 2 read-side compatibility.
 */
export function makeReadSessionInfo(deps: {
  repo: SessionRepositoryPort
}): (sessionId: SessionId) => Promise<SessionInfo | null> {
  return (sessionId: SessionId): Promise<SessionInfo | null> => deps.repo.readSessionInfo(sessionId)
}
