import type { SessionInfo } from '@earendil-works/pi-coding-agent'
import { describe, expect, it } from 'vitest'

import { cwd as makeCwd } from '../../_shared/domain/cwd'
import { path as makePath } from '../../_shared/domain/path'
import { sessionId as makeSessionId } from '../../_shared/domain/session-id'

import {
  InMemoryIndexer,
  InMemorySessionRepository,
  InMemorySessionStorage,
} from './in-memory-session-repository'

function makeSession(id: string, name?: string, modified?: Date): SessionInfo {
  return {
    path: `/sessions/${id}.jsonl`,
    id,
    cwd: '/Users/test/proj',
    name,
    created: new Date('2025-01-01T00:00:00Z'),
    modified: modified ?? new Date('2025-01-02T00:00:00Z'),
    messageCount: 1,
    firstMessage: 'hello',
    allMessagesText: '',
  }
}

describe('InMemorySessionRepository', () => {
  it('listSessions returns sessions sorted by modified DESC', async () => {
    const indexer = new InMemoryIndexer()
    const storage = new InMemorySessionStorage()
    const repo = new InMemorySessionRepository(storage, indexer)

    repo.setSession('/a.jsonl', makeSession('a', undefined, new Date('2025-01-01T00:00:00Z')))
    repo.setSession('/b.jsonl', makeSession('b', undefined, new Date('2025-01-05T00:00:00Z')))
    repo.setSession('/c.jsonl', makeSession('c', undefined, new Date('2025-01-03T00:00:00Z')))

    const result = await repo.listSessions(makeCwd('/Users/test/proj'))
    expect(result.map((s) => s.id)).toEqual(['b', 'c', 'a'])
  })

  it('readSessionInfo finds session by id', async () => {
    const repo = new InMemorySessionRepository(new InMemorySessionStorage(), new InMemoryIndexer())
    repo.setSession('/a.jsonl', makeSession('a'))
    repo.setSession('/b.jsonl', makeSession('b'))

    const found = await repo.readSessionInfo(makeSessionId('a'))
    expect(found?.id).toBe('a')

    const missing = await repo.readSessionInfo(makeSessionId('nonexistent'))
    expect(missing).toBeNull()
  })

  it('listSessionsSummary returns same as listSessions (Phase 1 simplification)', async () => {
    const repo = new InMemorySessionRepository(new InMemorySessionStorage(), new InMemoryIndexer())
    repo.setSession('/a.jsonl', makeSession('a'))

    const full = await repo.listSessions(makeCwd('/x'))
    const summary = await repo.listSessionsSummary(makeCwd('/x'))
    expect(summary).toEqual(full)
  })

  it('searchSessions returns empty array (Phase 1 placeholder)', async () => {
    const repo = new InMemorySessionRepository(new InMemorySessionStorage(), new InMemoryIndexer())
    const result = await repo.searchSessions('query')
    expect(result).toEqual({ results: [], truncated: false })
  })
})

describe('InMemorySessionStorage', () => {
  it('getSessionDir returns custom path if set, else default', () => {
    const storage = new InMemorySessionStorage()
    storage.setSessionDir(makeCwd('/foo'), '/custom/dir')
    expect(storage.getSessionDir(makeCwd('/foo'))).toBe('/custom/dir')
    expect(storage.getSessionDir(makeCwd('/bar'))).toBe('/fake/agent/sessions//bar')
  })

  it('readSessionInfo delegates to wired-up session map', async () => {
    const storage = new InMemorySessionStorage()
    const repo = new InMemorySessionRepository(storage, new InMemoryIndexer())
    repo.setSession('/x.jsonl', makeSession('x'))

    const result = await storage.readSessionInfo(makePath('/x.jsonl'))
    expect(result?.id).toBe('x')
  })

  it('readSessionInfo returns null when storage has no session map wired', async () => {
    const storage = new InMemorySessionStorage()
    // No repo constructed → setSessionsByPath never called
    const result = await storage.readSessionInfo(makePath('/x.jsonl'))
    expect(result).toBeNull()
  })
})

describe('InMemoryIndexer', () => {
  it('getIndex returns empty map by default', () => {
    const indexer = new InMemoryIndexer()
    expect(indexer.getIndex().size).toBe(0)
  })

  it('invalidate(path) drops single entry', () => {
    const indexer = new InMemoryIndexer()
    indexer.getIndex().set('/a.jsonl', {
      id: 'a',
      filePath: makePath('/a.jsonl'),
      mtimeMs: 100,
      size: 50,
    })
    indexer.invalidate(makePath('/a.jsonl'))
    expect(indexer.getIndex().size).toBe(0)
  })

  it('invalidate() without arg clears everything', () => {
    const indexer = new InMemoryIndexer()
    indexer.getIndex().set('/a', { id: 'a', filePath: makePath('/a'), mtimeMs: 0, size: 0 })
    indexer.invalidate()
    expect(indexer.getIndex().size).toBe(0)
  })

  it('persist is a no-op (returns Promise<void>)', async () => {
    const indexer = new InMemoryIndexer()
    await expect(indexer.persist()).resolves.toBeUndefined()
  })
})
