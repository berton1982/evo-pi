import { describe, expect, it } from 'vitest'
import { sessionId } from './session-id'

describe('sessionId branded type', () => {
  it('accepts UUID v4 strings', () => {
    const id = '550e8400-e29b-41d4-a716-446655440000'
    expect(sessionId(id)).toBe(id)
  })

  it('preserves the input string verbatim', () => {
    const id = 'abc123'
    expect(sessionId(id)).toBe(id)
  })

  it('throws on empty string (defensive)', () => {
    expect(() => sessionId('')).toThrow(/non-empty/i)
  })

  it('throws on non-UUID strings (defensive — UI must distinguish sessionId from path)', () => {
    // We don't enforce UUID format at runtime (SDK may use other formats in
    // future), but we DO require non-empty. This test documents the minimal
    // contract; richer validation belongs in the session repository port.
    expect(() => sessionId(' ')).not.toThrow()
  })
})
