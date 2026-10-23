import type { Cwd } from '../../_shared/domain/cwd'
import type { ProjectTrustPort, ProjectTrustStatus } from '../domain/project-trust'

/**
 * makeCheckProjectTrust — factory for checkProjectTrust use-case (per ADR 0003).
 *
 * Pure function pattern: caller injects port; use-case is a thin pass-through.
 *
 * Phase 1 scope:
 * - checkTrust(cwd) returns trust status (mostly trusted=true since no SDK integration yet)
 * - PR.D / Phase 2 will swap to SDK ProjectTrustStore-backed adapter
 *
 * @example
 *   const checkTrust = makeCheckProjectTrust({ trust: inMemoryAdapter })
 *   const status = checkTrust('/Users/foo/proj' as Cwd)
 */
export function makeCheckProjectTrust(deps: {
  trust: ProjectTrustPort
}): (cwd: Cwd) => ProjectTrustStatus {
  return (cwd: Cwd) => deps.trust.checkTrust(cwd)
}
