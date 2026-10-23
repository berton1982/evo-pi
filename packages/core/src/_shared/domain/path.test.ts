import { describe, expect, it } from 'vitest'
import { isPath, path } from './path'

describe('path branded type', () => {
  describe('path()', () => {
    it('accepts any non-empty string', () => {
      expect(path('/usr/local/bin')).toBe('/usr/local/bin')
    })

    it('preserves the input string verbatim (no encoding — that is SDK responsibility)', () => {
      // Per plan §0.4: this is just a branded wrapper, not encoding logic.
      // Path encoding lives in the SDK (getDefaultSessionDirPath), not here.
      expect(path('/Users/badlogic/workspaces/pi-mono')).toBe('/Users/badlogic/workspaces/pi-mono')
    })

    it('throws on empty string (defensive: empty paths cause silent downstream bugs)', () => {
      expect(() => path('')).toThrow(/non-empty/i)
    })
  })

  describe('isPath()', () => {
    it('returns true for any string at the type level', () => {
      // Branded types at runtime are just strings; isPath is a structural guard.
      expect(isPath('/foo')).toBe(true)
      expect(isPath('')).toBe(true)
    })

    it('returns false for non-string values', () => {
      expect(isPath(undefined)).toBe(false)
      expect(isPath(null)).toBe(false)
      expect(isPath(42)).toBe(false)
      expect(isPath({})).toBe(false)
    })
  })
})
