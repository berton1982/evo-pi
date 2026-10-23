/**
 * SessionNotFoundError + SessionReadError contract test (PR.C 2C.9).
 *
 * Per plan §2C.9:
 * - SessionNotFoundError thrown when sessionId → filePath lookup fails
 * - SessionReadError thrown when JSONL parse fails or SDK raises
 *   unexpected exceptions
 *
 * @vitest-environment node
 */

import { describe, expect, it } from 'vitest'

import { sessionId } from '../../_shared/domain/session-id'
import { SessionNotFoundError, SessionReadError } from './session-not-found-error'

describe('SessionNotFoundError (PR.C 2C.9)', () => {
  it('extends DomainError', () => {
    const err = new SessionNotFoundError(sessionId('abc'))
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(SessionNotFoundError)
    expect(err.kind).toBe('session_not_found')
  })

  it('carries the sessionId that was not found', () => {
    const sid = sessionId('missing-id')
    const err = new SessionNotFoundError(sid)
    expect(err.sessionId).toBe(sid)
    expect(err.message).toContain('missing-id')
  })

  it('preserves cause chain for SDK error wrapping', () => {
    const cause = new Error('SDK file open failed')
    const err = new SessionNotFoundError(sessionId('xyz'), cause)
    expect(err.cause).toBe(cause)
  })

  it('name property is "SessionNotFoundError" (per error convention)', () => {
    const err = new SessionNotFoundError(sessionId('q'))
    expect(err.name).toBe('SessionNotFoundError')
  })
})

describe('SessionReadError (PR.C 2C.9)', () => {
  it('extends DomainError', () => {
    const err = new SessionReadError('parse failed')
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(SessionReadError)
    expect(err.kind).toBe('session_read_error')
  })

  it('carries the original SDK error as cause', () => {
    const cause = new Error('JSONL syntax error at line 42')
    const err = new SessionReadError('wrapped', sessionId('sess-1'), cause)
    expect(err.sessionId).toBe(sessionId('sess-1'))
    expect(err.cause).toBe(cause)
  })

  it('name property is "SessionReadError"', () => {
    const err = new SessionReadError('oops')
    expect(err.name).toBe('SessionReadError')
  })
})
