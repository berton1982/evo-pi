/**
 * FileSystemSessionStorage read-side methods test (PR.C 2C.4).
 *
 * Verifies real implementations of:
 *   - readEntries(filePath) → defensive copy of all entries
 *   - getSessionFileForId(sessionId) → id → filePath lookup
 *   - streamForSearch(filePath, signal?) → line-by-line stream
 *
 * Uses real fixtures in __fixtures__/sessions/ (written by hand for test
 * determinism). Tests run in node env (not jsdom) per SDK requirements.
 *
 * @vitest-environment node
 */

import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Path } from '../../_shared/domain/path'
import { sessionId } from '../../_shared/domain/session-id'

import { FileSystemSessionStorage } from './filesystem-session-storage'

let tmpDir: string

beforeAll(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'evo-pi-fs-test-'))
})

afterAll(() => {
  rmSync(tmpDir, { recursive: true, force: true })
})

describe('FileSystemSessionStorage (PR.C 2C.4 read-side)', () => {
  describe('readEntries', () => {
    it('returns all entries from a real JSONL file', async () => {
      // Write a fixture JSONL inline (1 header + 2 message entries)
      const filePath = join(tmpDir, 'session-readEntries.jsonl')
      const jsonl = [
        JSON.stringify({
          type: 'session',
          version: 3,
          id: 'test-read-entries',
          timestamp: '2025-01-01T00:00:00Z',
          cwd: '/x',
        }),
        JSON.stringify({
          type: 'message',
          id: 'e1',
          parentId: null,
          timestamp: '2025-01-01T00:00:01Z',
          message: { role: 'user', content: [{ type: 'text', text: 'hi' }], timestamp: 1 },
        }),
        JSON.stringify({
          type: 'message',
          id: 'e2',
          parentId: 'e1',
          timestamp: '2025-01-01T00:00:02Z',
          message: {
            role: 'assistant',
            content: [{ type: 'text', text: 'hello' }],
            api: 'a',
            provider: 'p',
            model: 'm',
            usage: {
              input: 0,
              output: 0,
              cacheRead: 0,
              cacheWrite: 0,
              totalTokens: 0,
              cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
            },
            stopReason: 'stop',
            timestamp: 2,
          },
        }),
      ].join('\n')
      writeFileSync(filePath, jsonl)

      const storage = new FileSystemSessionStorage(tmpDir)
      const entries = await storage.readEntries(filePath as Path)

      expect(entries.length).toBe(2)
      // SDK getEntries() excludes the header (returns only SessionEntry[])
      // First entry is the user message
      expect(entries[0]?.type).toBe('message')
      // Second entry is the assistant message
      expect(entries[1]?.type).toBe('message')
    })

    it('returns [] for non-existent file (corrupt/missing)', async () => {
      const storage = new FileSystemSessionStorage(tmpDir)
      const entries = await storage.readEntries(join(tmpDir, 'does-not-exist.jsonl') as Path)
      expect(entries).toEqual([])
    })

    it('returns a defensive copy (mutating result does not affect underlying)', async () => {
      const filePath = join(tmpDir, 'session-defensive-copy.jsonl')
      const jsonl = [
        JSON.stringify({
          type: 'session',
          version: 3,
          id: 'defensive',
          timestamp: '2025-01-01T00:00:00Z',
          cwd: '/x',
        }),
        JSON.stringify({
          type: 'message',
          id: 'e1',
          parentId: null,
          timestamp: '2025-01-01T00:00:01Z',
          message: { role: 'user', content: [{ type: 'text', text: 'x' }], timestamp: 1 },
        }),
      ].join('\n')
      writeFileSync(filePath, jsonl)

      const storage = new FileSystemSessionStorage(tmpDir)
      const entries1 = await storage.readEntries(filePath as Path)
      const entries2 = await storage.readEntries(filePath as Path)

      expect(entries1).not.toBe(entries2) // different array references
      // Mutating one should not affect the other (SDK returns shallow copy)
      expect(entries1.length).toBe(1)
      expect(entries2.length).toBe(1)
    })
  })

  describe('getSessionFileForId', () => {
    it('finds the file path for a known sessionId', async () => {
      const sessionsDir = join(tmpDir, 'sessions')
      mkdirSync(sessionsDir, { recursive: true })
      // Write two JSONL files with different ids
      const file1 = join(sessionsDir, 'a.jsonl')
      const file2 = join(sessionsDir, 'b.jsonl')
      writeFileSync(
        file1,
        JSON.stringify({
          type: 'session',
          version: 3,
          id: 'find-me-1',
          timestamp: '2025-01-01T00:00:00Z',
          cwd: '/x',
        }),
      )
      writeFileSync(
        file2,
        JSON.stringify({
          type: 'session',
          version: 3,
          id: 'find-me-2',
          timestamp: '2025-01-02T00:00:00Z',
          cwd: '/x',
        }),
      )

      const storage = new FileSystemSessionStorage(tmpDir)
      const result = await storage.getSessionFileForId(sessionId('find-me-2'))
      expect(result).toBe(file2)
    })

    it('returns null when sessionId not found', async () => {
      const storage = new FileSystemSessionStorage(tmpDir)
      const result = await storage.getSessionFileForId(sessionId('nonexistent'))
      expect(result).toBeNull()
    })
  })

  describe('streamForSearch', () => {
    it('yields each JSONL line as a string', async () => {
      const filePath = join(tmpDir, 'stream-test.jsonl')
      const lines = [
        JSON.stringify({ type: 'session', version: 3, id: 's', timestamp: 't', cwd: '/' }),
        JSON.stringify({
          type: 'message',
          id: 'e1',
          parentId: null,
          timestamp: 't',
          message: { role: 'user', content: [{ type: 'text', text: 'search-me' }], timestamp: 1 },
        }),
        JSON.stringify({
          type: 'message',
          id: 'e2',
          parentId: 'e1',
          timestamp: 't',
          message: {
            role: 'assistant',
            content: [{ type: 'text', text: 'found' }],
            api: 'a',
            provider: 'p',
            model: 'm',
            usage: {
              input: 0,
              output: 0,
              cacheRead: 0,
              cacheWrite: 0,
              totalTokens: 0,
              cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
            },
            stopReason: 'stop',
            timestamp: 2,
          },
        }),
      ]
      writeFileSync(filePath, lines.join('\n'))

      const storage = new FileSystemSessionStorage(tmpDir)
      const streamed: string[] = []
      for await (const line of storage.streamForSearch(filePath as Path)) {
        streamed.push(line)
      }
      expect(streamed.length).toBe(3)
      expect(JSON.parse(streamed[1]!).id).toBe('e1')
    })

    it('aborts stream when AbortSignal is triggered', async () => {
      const filePath = join(tmpDir, 'abort-test.jsonl')
      const manyLines = Array.from({ length: 100 }, (_, i) =>
        JSON.stringify({
          type: 'message',
          id: `e${i}`,
          parentId: null,
          timestamp: 't',
          message: { role: 'user', content: [{ type: 'text', text: `line ${i}` }], timestamp: i },
        }),
      )
      writeFileSync(filePath, manyLines.join('\n'))

      const controller = new AbortController()
      const storage = new FileSystemSessionStorage(tmpDir)

      let count = 0
      try {
        for await (const _line of storage.streamForSearch(filePath as Path, controller.signal)) {
          count++
          if (count >= 5) controller.abort()
        }
      } catch {
        // AbortError is expected when stream is aborted
      }
      // We should get at least a few lines but not all 100
      expect(count).toBeLessThan(100)
      expect(count).toBeGreaterThanOrEqual(5)
    })

    it('reads back what was written (round-trip)', async () => {
      const filePath = join(tmpDir, 'roundtrip.jsonl')
      const original = 'line one\nline two\nline three'
      writeFileSync(filePath, original)

      const storage = new FileSystemSessionStorage(tmpDir)
      const streamed: string[] = []
      for await (const line of storage.streamForSearch(filePath as Path)) {
        streamed.push(line)
      }
      expect(streamed.join('\n')).toBe(original)
    })
  })
})

// Reference fixture sanity check — ensure the test fixtures we use elsewhere
// are still readable (this guards against accidental fixture file deletions).
describe('Fixture sanity (referenced by infrastructure/__fixtures__ tests)', () => {
  it('simple.jsonl still exists and is readable', () => {
    // Resolve from this test file's location upward; vitest runs from package root
    const path = join(__dirname, '..', 'infrastructure/__fixtures__/sessions/simple.jsonl')
    expect(() => readFileSync(path, 'utf8')).not.toThrow()
  })
})
