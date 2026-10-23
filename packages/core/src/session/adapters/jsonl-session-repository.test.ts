/**
 * @vitest-environment node — real FileSystemSessionStorage uses node:fs
 * (in-memory adapter used for orchestration logic only).
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { cwd as makeCwd } from '../../_shared/domain/cwd'
import { path as makePath } from '../../_shared/domain/path'
import { sessionId } from '../../_shared/domain/session-id'

import { FileSystemSessionStorage } from './filesystem-session-storage'
import {
  InMemoryIndexer,
  InMemorySessionRepository,
  InMemorySessionStorage,
} from './in-memory-session-repository'
import { JsonlSessionRepository } from './jsonl-session-repository'
import { ScanIndexStore } from './scan-index-store'

describe('JsonlSessionRepository (Phase 1: orchestrates in-memory adapters)', () => {
  it('listSessions returns what InMemorySessionRepository returns (delegation works)', async () => {
    const indexer = new InMemoryIndexer()
    const storage = new InMemorySessionStorage()
    const fakeRepo = new InMemorySessionRepository(storage, indexer)

    fakeRepo.setSession('/a.jsonl', {
      id: 'a',
      cwd: '/x',
      created: new Date(),
      modified: new Date(),
      messageCount: 1,
      firstMessage: 'hi',
      allMessagesText: '',
      path: '/a.jsonl',
    })

    const repo = new JsonlSessionRepository(storage, indexer)
    const result = await repo.listSessions(makeCwd('/x'))
    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe('a')
  })

  it('enumerates session files from storage and returns matching sessions', async () => {
    // The InMemorySessionStorage uses the attached repo for lookup.
    const indexer = new InMemoryIndexer()
    const storage = new InMemorySessionStorage()
    const fakeRepo = new InMemorySessionRepository(storage, indexer)

    fakeRepo.setSession('/a.jsonl', {
      id: 'a',
      cwd: '/x',
      created: new Date(),
      modified: new Date(),
      messageCount: 1,
      firstMessage: 'hi',
      allMessagesText: '',
      path: '/a.jsonl',
    })
    fakeRepo.setSession('/b.jsonl', {
      id: 'b',
      cwd: '/x',
      created: new Date(),
      modified: new Date(),
      messageCount: 1,
      firstMessage: 'hi',
      allMessagesText: '',
      path: '/b.jsonl',
    })

    const repo = new JsonlSessionRepository(storage, indexer)
    const result = await repo.listSessions(makeCwd('/x'))
    expect(result).toHaveLength(2)
  })

  it('invalidate removes orphan index entries after scan', async () => {
    const indexer = new InMemoryIndexer()
    indexer.getIndex().set('/orphan.jsonl', {
      id: 'orphan',
      filePath: makePath('/orphan.jsonl'),
      mtimeMs: 100,
      size: 50,
    })

    const storage = new InMemorySessionStorage()
    const _fakeRepo = new InMemorySessionRepository(storage, indexer)

    const repo = new JsonlSessionRepository(storage, indexer)
    await repo.listSessions(makeCwd('/x'))
    // orphan should be dropped because no current file enumerates it
    expect(indexer.getIndex().has('/orphan.jsonl')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// PR.C 2C.5: read-side tests using real FileSystemSessionStorage
// ---------------------------------------------------------------------------

let tmpDir: string

beforeAll(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'evo-pi-repo-test-'))
})

afterAll(() => {
  rmSync(tmpDir, { recursive: true, force: true })
})

describe('JsonlSessionRepository (PR.C 2C.5 read-side)', () => {
  describe('readSessionEntries', () => {
    it('returns all entries for a known sessionId', async () => {
      // Write a fixture session under agentDir/sessions/
      mkdirSync(join(tmpDir, 'sessions', '--x--'), { recursive: true })
      const sessionsDir = join(tmpDir, 'sessions', '--x--')
      const filePath = join(sessionsDir, '2025-01-01T00-00-00Z_session1.jsonl')
      const jsonl = [
        JSON.stringify({
          type: 'session',
          version: 3,
          id: 'sess-1',
          timestamp: '2025-01-01T00:00:00Z',
          cwd: '/x',
        }),
        JSON.stringify({
          type: 'message',
          id: 'e1',
          parentId: null,
          timestamp: '2025-01-01T00:00:01Z',
          message: { role: 'user', content: [{ type: 'text', text: 'hello' }], timestamp: 1 },
        }),
        JSON.stringify({
          type: 'message',
          id: 'e2',
          parentId: 'e1',
          timestamp: '2025-01-01T00:00:02Z',
          message: {
            role: 'assistant',
            content: [{ type: 'text', text: 'world' }],
            api: 'anthropic-messages',
            provider: 'anthropic',
            model: 'claude-sonnet-4-5',
            usage: {
              input: 100,
              output: 50,
              cacheRead: 0,
              cacheWrite: 0,
              totalTokens: 150,
              cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
            },
            stopReason: 'stop',
            timestamp: 2,
          },
        }),
      ].join('\n')
      writeFileSync(filePath, jsonl)

      const storage = new FileSystemSessionStorage(tmpDir)
      const indexer = new ScanIndexStore(tmpDir)
      const repo = new JsonlSessionRepository(storage, indexer)

      const entries = await repo.readSessionEntries(sessionId('sess-1'))
      expect(entries.length).toBe(2) // SDK excludes header
      expect(entries[0]?.type).toBe('message')
      expect(entries[1]?.type).toBe('message')
    })

    it('throws SessionNotFoundError for unknown sessionId', async () => {
      const storage = new FileSystemSessionStorage(tmpDir)
      const indexer = new ScanIndexStore(tmpDir)
      const repo = new JsonlSessionRepository(storage, indexer)

      await expect(repo.readSessionEntries(sessionId('nonexistent'))).rejects.toThrow(
        /Session not found/,
      )
    })
  })

  describe('readSessionContext', () => {
    it('builds SessionContext for a known sessionId', async () => {
      mkdirSync(join(tmpDir, 'sessions', '--y--'), { recursive: true })
      const sessionsDir = join(tmpDir, 'sessions', '--y--')
      const filePath = join(sessionsDir, '2025-01-01T00-00-00Z_session2.jsonl')
      const jsonl = [
        JSON.stringify({
          type: 'session',
          version: 3,
          id: 'sess-2',
          timestamp: '2025-01-01T00:00:00Z',
          cwd: '/y',
        }),
        JSON.stringify({
          type: 'message',
          id: 'e1',
          parentId: null,
          timestamp: '2025-01-01T00:00:01Z',
          message: { role: 'user', content: [{ type: 'text', text: 'q1' }], timestamp: 1 },
        }),
        JSON.stringify({
          type: 'message',
          id: 'e2',
          parentId: 'e1',
          timestamp: '2025-01-01T00:00:02Z',
          message: {
            role: 'assistant',
            content: [{ type: 'text', text: 'a1' }],
            api: 'anthropic-messages',
            provider: 'anthropic',
            model: 'claude-sonnet-4-5',
            usage: {
              input: 100,
              output: 50,
              cacheRead: 0,
              cacheWrite: 0,
              totalTokens: 150,
              cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
            },
            stopReason: 'stop',
            timestamp: 2,
          },
        }),
      ].join('\n')
      writeFileSync(filePath, jsonl)

      const storage = new FileSystemSessionStorage(tmpDir)
      const indexer = new ScanIndexStore(tmpDir)
      const repo = new JsonlSessionRepository(storage, indexer)

      const ctx = await repo.readSessionContext(sessionId('sess-2'))
      expect(ctx.messages.length).toBe(2)
      expect(ctx.entryIds.length).toBe(2)
      expect(ctx.oldestEntryId).toBe('e1')
      expect(ctx.hasMore).toBe(false)
      expect(ctx.thinkingLevel).toBe('off')
      expect(ctx.model?.provider).toBe('anthropic')
      expect(ctx.model?.modelId).toBe('claude-sonnet-4-5')
    })

    it('throws SessionNotFoundError for unknown sessionId', async () => {
      const storage = new FileSystemSessionStorage(tmpDir)
      const indexer = new ScanIndexStore(tmpDir)
      const repo = new JsonlSessionRepository(storage, indexer)
      await expect(repo.readSessionContext(sessionId('nope'))).rejects.toThrow(/Session not found/)
    })
  })

  describe('readSessionTree', () => {
    it('returns empty array for a linear session (no forks)', async () => {
      mkdirSync(join(tmpDir, 'sessions', '--z--'), { recursive: true })
      const sessionsDir = join(tmpDir, 'sessions', '--z--')
      const filePath = join(sessionsDir, 'session3.jsonl')
      const jsonl = [
        JSON.stringify({
          type: 'session',
          version: 3,
          id: 'sess-3',
          timestamp: '2025-01-01T00:00:00Z',
          cwd: '/z',
        }),
        JSON.stringify({
          type: 'message',
          id: 'e1',
          parentId: null,
          timestamp: '2025-01-01T00:00:01Z',
          message: { role: 'user', content: [{ type: 'text', text: 'q' }], timestamp: 1 },
        }),
      ].join('\n')
      writeFileSync(filePath, jsonl)

      const storage = new FileSystemSessionStorage(tmpDir)
      const indexer = new ScanIndexStore(tmpDir)
      const repo = new JsonlSessionRepository(storage, indexer)

      const tree = await repo.readSessionTree(sessionId('sess-3'))
      // Linear session: single root with no children = 1 root node
      expect(tree.length).toBe(1)
    })

    it('throws SessionNotFoundError for unknown sessionId', async () => {
      const storage = new FileSystemSessionStorage(tmpDir)
      const indexer = new ScanIndexStore(tmpDir)
      const repo = new JsonlSessionRepository(storage, indexer)
      await expect(repo.readSessionTree(sessionId('nope'))).rejects.toThrow(/Session not found/)
    })
  })

  describe('readSessionContext — pagination (PR.D follow-up)', () => {
    it('returns all messages by default (no truncation to 50)', async () => {
      mkdirSync(join(tmpDir, 'sessions', '--large--'), { recursive: true })
      const largeDir = join(tmpDir, 'sessions', '--large--')
      const filePath = join(largeDir, 'big.jsonl')
      // 80-message session
      const lines: string[] = [
        JSON.stringify({
          type: 'session',
          version: 3,
          id: 'big',
          timestamp: '2026-01-01T00:00:00.000Z',
          cwd: '/large',
        }),
      ]
      for (let i = 0; i < 80; i++) {
        const role = i % 2 === 0 ? 'user' : 'assistant'
        lines.push(
          JSON.stringify({
            type: 'message',
            id: `m${i}`,
            parentId: i === 0 ? null : `m${i - 1}`,
            timestamp: `2026-01-01T00:00:${String(i).padStart(2, '0')}.000Z`,
            message:
              role === 'assistant'
                ? {
                    role,
                    content: [{ type: 'text', text: `r${i}` }],
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
                    stopReason: 'end_turn',
                    timestamp: 0,
                  }
                : { role, content: [{ type: 'text', text: `q${i}` }], timestamp: 0 },
          }),
        )
      }
      writeFileSync(filePath, lines.join('\n'))
      const storage = new FileSystemSessionStorage(tmpDir)
      const indexer = new ScanIndexStore(tmpDir)
      const repo = new JsonlSessionRepository(storage, indexer)
      const ctx = await repo.readSessionContext(sessionId('big'))
      // PR.D follow-up: default is all (was 50). 80 < 10000 cap, so all returned.
      expect(ctx.messages.length).toBe(80)
      expect(ctx.entryIds[0]).toBe('m0')
      expect(ctx.entryIds[ctx.entryIds.length - 1]).toBe('m79')
      expect(ctx.hasMore).toBe(false)
    })

    it('respects explicit tail cap', async () => {
      const storage = new FileSystemSessionStorage(tmpDir)
      const indexer = new ScanIndexStore(tmpDir)
      const repo = new JsonlSessionRepository(storage, indexer)
      const ctx = await repo.readSessionContext(sessionId('big'), { tail: 5 })
      expect(ctx.messages.length).toBe(5)
      expect(ctx.entryIds[ctx.entryIds.length - 1]).toBe('m79')
      expect(ctx.hasMore).toBe(true) // 80 > 5 → more exist
    })

    it('before cursor returns strictly-older messages (per pi-web pattern)', async () => {
      const storage = new FileSystemSessionStorage(tmpDir)
      const indexer = new ScanIndexStore(tmpDir)
      const repo = new JsonlSessionRepository(storage, indexer)
      // First page: last 3 (oldest = m77, m78, m79)
      const first = await repo.readSessionContext(sessionId('big'), { tail: 3 })
      expect(first.entryIds).toEqual(['m77', 'm78', 'm79'])
      const firstOldest = first.entryIds[0]!
      // Second page: 3 older than m77
      const second = await repo.readSessionContext(sessionId('big'), {
        before: firstOldest,
        tail: 3,
      })
      expect(second.entryIds).toEqual(['m74', 'm75', 'm76'])
      expect(second.hasMore).toBe(true)
    })

    it('before cursor with tail > available returns all older, hasMore=false', async () => {
      const storage = new FileSystemSessionStorage(tmpDir)
      const indexer = new ScanIndexStore(tmpDir)
      const repo = new JsonlSessionRepository(storage, indexer)
      // First page of 5
      const first = await repo.readSessionContext(sessionId('big'), { tail: 5 })
      // before=firstOldest, tail=100 → all 75 older messages
      const second = await repo.readSessionContext(sessionId('big'), {
        before: first.entryIds[0]!,
        tail: 100,
      })
      expect(second.messages.length).toBe(75)
      expect(second.hasMore).toBe(false)
    })

    it('before referencing unknown entryId returns empty', async () => {
      const storage = new FileSystemSessionStorage(tmpDir)
      const indexer = new ScanIndexStore(tmpDir)
      const repo = new JsonlSessionRepository(storage, indexer)
      const ctx = await repo.readSessionContext(sessionId('big'), {
        before: 'nonexistent',
        tail: 10,
      })
      expect(ctx.messages.length).toBe(0)
      expect(ctx.hasMore).toBe(false)
    })
  })

  describe('searchSessions', () => {
    it('returns empty results for empty query', async () => {
      const storage = new FileSystemSessionStorage(tmpDir)
      const indexer = new ScanIndexStore(tmpDir)
      const repo = new JsonlSessionRepository(storage, indexer)
      const result = await repo.searchSessions('')
      expect(result.results).toEqual([])
      expect(result.truncated).toBe(false)
    })

    it('returns SessionSearchResponse with results from real sessions', async () => {
      // Write a session with searchable text
      mkdirSync(join(tmpDir, 'sessions', '--w--'), { recursive: true })
      const sessionsDir = join(tmpDir, 'sessions', '--w--')
      const filePath = join(sessionsDir, 'session-search.jsonl')
      const jsonl = [
        JSON.stringify({
          type: 'session',
          version: 3,
          id: 'sess-search',
          timestamp: '2025-01-01T00:00:00Z',
          cwd: '/w',
        }),
        JSON.stringify({
          type: 'message',
          id: 'e1',
          parentId: null,
          timestamp: '2025-01-01T00:00:01Z',
          message: {
            role: 'user',
            content: [{ type: 'text', text: 'hello world searchable' }],
            timestamp: 1,
          },
        }),
      ].join('\n')
      writeFileSync(filePath, jsonl)

      const storage = new FileSystemSessionStorage(tmpDir)
      const indexer = new ScanIndexStore(tmpDir)
      const repo = new JsonlSessionRepository(storage, indexer)

      const result = await repo.searchSessions('searchable')
      expect(result.results.length).toBeGreaterThan(0)
      expect(result.results[0]?.session.id).toBe('sess-search')
      expect(result.results[0]?.match).toContain('searchable')
    })

    it('escapes regex special characters (literal substring match)', async () => {
      const storage = new FileSystemSessionStorage(tmpDir)
      const indexer = new ScanIndexStore(tmpDir)
      const repo = new JsonlSessionRepository(storage, indexer)
      const result = await repo.searchSessions('.*')
      expect(result.results).toEqual([])
    })

    it('respects 200-char query limit (throws or returns empty above limit)', async () => {
      const storage = new FileSystemSessionStorage(tmpDir)
      const indexer = new ScanIndexStore(tmpDir)
      const repo = new JsonlSessionRepository(storage, indexer)
      const longQ = 'x'.repeat(201)
      // Per pi-web pattern: throws RangeError; caller (web route) maps to 400
      await expect(repo.searchSessions(longQ)).rejects.toThrow(/200/)
    })
  })
})
