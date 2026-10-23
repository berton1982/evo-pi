import type { SessionInfo } from '@earendil-works/pi-coding-agent'

import type { Cwd } from '../../_shared/domain/cwd'
import type { SessionRepositoryPort } from '../domain/ports/session-repository'

/**
 * makeListSessions — factory for listSessions use-case (per ADR 0003).
 *
 * Pure function pattern: caller injects port; use-case is a thin pass-through.
 *
 * Why factory: enables test-time fake-port injection without coupling to
 * filesystem / SDK. Phase 1 callers (web route.ts) wire the real
 * JsonlSessionRepository + FileSystemSessionStorage.
 *
 * Mirror pi-web `lib/session-reader.ts:listAllSessions` signature:
 *   listAllSessions(options: { force?: boolean }): Promise<SessionInfo[]>
 *
 * evo-pi adds explicit `cwd` parameter (pi-web uses globalThis cwd).
 *
 * @example
 *   const listSessions = makeListSessions({ repo: realAdapter })
 *   const sessions = await listSessions(cwd('/Users/foo/proj'))
 *   // sorted by modified DESC by adapter (sidebar UX)
 */
export function makeListSessions(deps: {
  repo: SessionRepositoryPort
}): (cwd: Cwd, options?: { force?: boolean }) => Promise<SessionInfo[]> {
  return (cwd: Cwd, options?: { force?: boolean }): Promise<SessionInfo[]> =>
    deps.repo.listSessions(cwd, options)
}
