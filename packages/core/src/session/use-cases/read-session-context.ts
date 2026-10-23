import type { SessionId } from '../../_shared/domain/session-id'
import type { SessionRepositoryPort } from '../domain/ports/session-repository'
import type { SessionContext } from '../domain/types'

/**
 * makeReadSessionContext — factory for UC-SES-06 read-session-context.
 *
 * Pure pass-through to repo.readSessionContext. Throws SessionNotFoundError
 * (per ADR 0003) when sessionId cannot be resolved — caller maps to 404.
 *
 * @example
 *   const readSessionContext = makeReadSessionContext({ repo: realAdapter })
 *   const ctx = await readSessionContext(sessionId('abc'), { tail: 50 })
 *   // ctx.messages, ctx.entryIds, ctx.model, ...
 */
export function makeReadSessionContext(deps: {
  repo: SessionRepositoryPort
}): (
  sessionId: SessionId,
  options?: { leafId?: string | null; before?: string; tail?: number },
) => Promise<SessionContext> {
  return (
    sessionId: SessionId,
    options?: { leafId?: string | null; before?: string; tail?: number },
  ): Promise<SessionContext> => deps.repo.readSessionContext(sessionId, options)
}
