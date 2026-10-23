import type { SessionId } from '../../_shared/domain/session-id'
import type { SessionRepositoryPort } from '../domain/ports/session-repository'
import type { SessionTreeNode } from '../domain/types'

/**
 * makeReadSessionTree — factory for UC-SES-08 read-session-tree.
 *
 * Pure pass-through to repo.readSessionTree. Returns the fork / subagent
 * tree view (defensive copy from SDK getTree()).
 */
export function makeReadSessionTree(deps: {
  repo: SessionRepositoryPort
}): (sessionId: SessionId) => Promise<SessionTreeNode[]> {
  return (sessionId: SessionId): Promise<SessionTreeNode[]> => deps.repo.readSessionTree(sessionId)
}
