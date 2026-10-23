import { describe, expect, it } from 'vitest'
import { DomainError } from './domain-error'

class SampleError extends DomainError {
  readonly kind = 'sample_error' as const
}

describe('DomainError', () => {
  it('stores the message', () => {
    const err = new SampleError('boom')
    expect(err.message).toBe('boom')
  })

  it('exposes a kind discriminator', () => {
    const err = new SampleError('boom')
    expect(err.kind).toBe('sample_error')
  })

  it('preserves cause when provided', () => {
    const cause = new Error('underlying')
    const err = new SampleError('wrapped', cause)
    expect(err.cause).toBe(cause)
  })

  it('cause is undefined when not provided', () => {
    const err = new SampleError('boom')
    expect(err.cause).toBeUndefined()
  })

  it('is catchable as Error (prototype chain intact)', () => {
    const err = new SampleError('boom')
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(DomainError)
  })
})
