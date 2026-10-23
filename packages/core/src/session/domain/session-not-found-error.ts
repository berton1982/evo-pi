/**
 * SessionNotFoundError — thrown by read-side use-cases when sessionId
 * cannot be resolved to a file path.
 *
 * Per ADR 0003 typed-error pattern (per capability-boundary-final §5.2):
 * - Extends the abstract DomainError base
 * - Has `kind` discriminator for transport-layer mapping
 * - Carries the sessionId that wasn't found (for error messages)
 *
 * Mapping:
 * - web route handler (Task 2C.7): catches → returns HTTP 404 with body
 *   { error: 'session_not_found', sessionId: '...' }
 * - pi-web pattern: returns null (per session-reader.ts:556). evo-pi diverges:
 *   throws typed error per ADR 0003 (cleaner than null + check at every caller).
 *
 * Cross-validation: pi-web resolveSessionPath returns null on miss
 * (ref_projects/pi-web/lib/session-reader.ts:556-580). evo-pi throws —
 * documented in ledger Rulings I made.
 */

import { DomainError } from '../../_shared/domain/domain-error'
import type { SessionId } from '../../_shared/domain/session-id'

export class SessionNotFoundError extends DomainError {
  readonly kind = 'session_not_found' as const

  constructor(
    public readonly sessionId: SessionId,
    cause?: unknown,
  ) {
    super(`Session not found: ${sessionId as string}`, cause)
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

/**
 * SessionReadError — thrown when JSONL parsing fails or SDK raises
 * unexpected exceptions during read operations.
 *
 * Wraps the underlying error so the web route handler can surface
 * a 500 + the original cause for debugging.
 */
export class SessionReadError extends DomainError {
  readonly kind = 'session_read_error' as const

  constructor(
    message: string,
    public readonly sessionId?: SessionId,
    originalError?: unknown,
  ) {
    super(message, originalError)
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
