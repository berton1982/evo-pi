import { describe, expect, it } from 'vitest'
import { parseSessionInfo, parseSessionInfoArray, SessionParseError } from '@/lib/session-parser'

// Reference fixture mirrors mock-sessions.json shape (per PR.A.1):
// - JSON fixture stores created/modified as ISO strings (JSON has no Date type)
// - SDK SessionInfo types them as Date — parser promotes string → Date
// - `as unknown as` avoids forcing the raw fixture into SessionInfo shape
//   (which would require constructing Date objects upfront in tests)
const validSession = {
  path: '/Users/badlogic/.pi/agent/sessions/--Users-badlogic-workspaces-pi-mono--/2025-12-09T00-53-29-825Z_ffae836b.jsonl',
  id: 'ffae836b-9420-4060-ac13-7745215f90ff',
  cwd: '/Users/badlogic/workspaces/pi-mono',
  name: 'Untangle main.ts and tui-renderer.ts',
  created: '2025-12-09T00:53:29.825Z',
  modified: '2025-12-09T03:12:48.117Z',
  messageCount: 42,
  firstMessage: 'alright, read @packages/coding-agent/src/main.ts...',
  allMessagesText: '[42 messages totaling 84KB]',
} as unknown as Record<string, unknown>

describe('parseSessionInfo', () => {
  it('returns a SessionInfo for a valid raw object', () => {
    const result = parseSessionInfo(validSession)
    expect(result.id).toBe(validSession.id)
    expect(result.cwd).toBe(validSession.cwd)
    expect(result.messageCount).toBe(42)
  })

  it('accepts a raw object that omits optional `name`', () => {
    const { name: _omitted, ...withoutName } = validSession
    const result = parseSessionInfo(withoutName)
    expect(result.name).toBeUndefined()
  })

  it('throws SessionParseError when `id` is missing', () => {
    const { id: _id, ...bad } = validSession
    expect(() => parseSessionInfo(bad)).toThrow(SessionParseError)
  })

  it('throws SessionParseError when `messageCount` is negative', () => {
    expect(() => parseSessionInfo({ ...validSession, messageCount: -1 })).toThrow(SessionParseError)
  })

  it('throws SessionParseError when input is null', () => {
    expect(() => parseSessionInfo(null)).toThrow(SessionParseError)
  })

  it('throws SessionParseError when input is a primitive', () => {
    expect(() => parseSessionInfo('not-an-object')).toThrow(SessionParseError)
  })
})

describe('parseSessionInfoArray', () => {
  it('returns N parsed SessionInfo for an array of N valid objects', () => {
    const result = parseSessionInfoArray([validSession, validSession, validSession])
    expect(result).toHaveLength(3)
  })

  it('returns an empty array for an empty array', () => {
    expect(parseSessionInfoArray([])).toEqual([])
  })

  it('throws SessionParseError when any element is invalid (fail-fast)', () => {
    const { id: _id, ...bad } = validSession
    expect(() => parseSessionInfoArray([validSession, bad])).toThrow(SessionParseError)
  })

  it('throws SessionParseError when input is not an array', () => {
    expect(() => parseSessionInfoArray(validSession)).toThrow(SessionParseError)
  })
})

describe('SessionParseError', () => {
  it('is throwable and carries a useful message', () => {
    try {
      parseSessionInfo(null)
      throw new Error('should have thrown')
    } catch (e) {
      expect(e).toBeInstanceOf(SessionParseError)
      expect((e as SessionParseError).message).toContain('null')
    }
  })
})
