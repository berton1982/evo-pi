import type { SessionEntry, SessionInfo } from '@earendil-works/pi-coding-agent'
import { describe, expectTypeOf, it } from 'vitest'

import { cwd } from '../../../_shared/domain/cwd'
import { path } from '../../../_shared/domain/path'
import { sessionId } from '../../../_shared/domain/session-id'
import type { IndexEntry, IndexMap, SessionIndexerPort } from './session-indexer'
import type { SessionRepositoryPort } from './session-repository'
import type { SessionStoragePort } from './session-storage'

/**
 * Ports are interfaces — pure type contract tests.
 *
 * Runtime validation happens when adapters (1C.4) implement these ports.
 * These tests assert the interface signatures are usable (callers can invoke
 * with the documented arg shapes).
 */

describe('SessionRepositoryPort (compile-time)', () => {
  it('listSessions accepts cwd + optional force flag, returns SessionInfo[]', () => {
    expectTypeOf<SessionRepositoryPort>().toHaveProperty('listSessions')
    const fakeRepo: SessionRepositoryPort = {
      listSessions: async (_cwd, _options) => {
        return [] as SessionInfo[]
      },
      listSessionsSummary: async (_cwd) => [],
      searchSessions: async (_query) => ({ results: [], truncated: false }),
      readSessionInfo: async (_id) => null,
      readSessionContext: async (_id) => ({
        messages: [],
        entryIds: [],
        oldestEntryId: null,
        hasMore: false,
        thinkingLevel: 'off',
        model: null,
      }),
      readSessionEntries: async (_id) => [],
      readSessionTree: async (_id) => [],
    }
    expectTypeOf(fakeRepo.listSessions).returns.toEqualTypeOf<Promise<SessionInfo[]>>()
  })
})

describe('SessionStoragePort (compile-time)', () => {
  it('getSessionDir accepts cwd, returns string', () => {
    const fakeStorage: SessionStoragePort = {
      getSessionDir: (_cwd) => '/sessions/path',
      readSessionInfo: async (_filePath) => null,
      enumerateSessionFiles: async () => [],
      readEntries: async (_filePath) => [] as SessionEntry[],
      getSessionFileForId: async (_sessionId) => null,
      streamForSearch: async function* () {
        yield ''
      },
    }
    expectTypeOf(fakeStorage.getSessionDir(cwd('/x'))).toEqualTypeOf<string>()
  })

  it('readSessionInfo accepts Path, returns Promise<SessionInfo | null>', () => {
    const fakeStorage: SessionStoragePort = {
      getSessionDir: () => '',
      readSessionInfo: async (_filePath) => null,
      enumerateSessionFiles: async () => [],
      readEntries: async () => [],
      getSessionFileForId: async () => null,
      streamForSearch: async function* () {
        yield ''
      },
    }
    expectTypeOf(fakeStorage.readSessionInfo(path('/x.jsonl'))).toEqualTypeOf<
      Promise<SessionInfo | null>
    >()
  })

  // PR.C 2C.2: 3 new methods for read-side
  it('readEntries accepts Path, returns Promise<SessionEntry[]>', () => {
    const fakeStorage: SessionStoragePort = {
      getSessionDir: () => '',
      readSessionInfo: async () => null,
      enumerateSessionFiles: async () => [],
      readEntries: async (_filePath) => [] as SessionEntry[],
      getSessionFileForId: async () => null,
      streamForSearch: async function* () {
        yield ''
      },
    }
    expectTypeOf(fakeStorage.readEntries(path('/x.jsonl'))).toEqualTypeOf<Promise<SessionEntry[]>>()
  })

  it('getSessionFileForId accepts sessionId, returns Promise<string | null>', () => {
    const fakeStorage: SessionStoragePort = {
      getSessionDir: () => '',
      readSessionInfo: async () => null,
      enumerateSessionFiles: async () => [],
      readEntries: async () => [],
      getSessionFileForId: async (_sessionId) => null,
      streamForSearch: async function* () {
        yield ''
      },
    }
    expectTypeOf(fakeStorage.getSessionFileForId(sessionId('abc'))).toEqualTypeOf<
      Promise<string | null>
    >()
  })

  it('streamForSearch accepts Path + optional AbortSignal, returns AsyncIterable<string>', () => {
    const fakeStorage: SessionStoragePort = {
      getSessionDir: () => '',
      readSessionInfo: async () => null,
      enumerateSessionFiles: async () => [],
      readEntries: async () => [],
      getSessionFileForId: async () => null,
      async *streamForSearch(_filePath: string, _signal?: AbortSignal): AsyncIterable<string> {
        yield ''
      },
    }
    // Smoke test: verify the method is async-iterable
    const iter = fakeStorage.streamForSearch(path('/x.jsonl'))
    expectTypeOf(iter).toMatchTypeOf<AsyncIterable<string>>()
  })
})

describe('SessionIndexerPort (compile-time)', () => {
  it('getIndex returns IndexMap', () => {
    const fakeIndexer: SessionIndexerPort = {
      getIndex: () => new Map<string, IndexEntry>(),
      invalidate: (_filePath) => {},
      persist: async () => {},
    }
    expectTypeOf(fakeIndexer.getIndex()).toEqualTypeOf<IndexMap>()
  })

  it('invalidate accepts optional Path', () => {
    const fakeIndexer: SessionIndexerPort = {
      getIndex: () => new Map(),
      invalidate: (_filePath) => {},
      persist: async () => {},
    }
    // No-arg form
    fakeIndexer.invalidate()
    // Optional Path form
    fakeIndexer.invalidate(path('/x.jsonl'))
  })

  it('persist returns Promise<void>', () => {
    const fakeIndexer: SessionIndexerPort = {
      getIndex: () => new Map(),
      invalidate: () => {},
      persist: async () => {},
    }
    expectTypeOf(fakeIndexer.persist()).toEqualTypeOf<Promise<void>>()
  })
})

describe('SessionId / Cwd / Path branded types (cross-port consistency)', () => {
  it('sessionId is a branded string usable with readSessionInfo', () => {
    type ReadFn = SessionRepositoryPort['readSessionInfo']
    expectTypeOf<ReadFn>().parameter(0).toMatchTypeOf<ReturnType<typeof sessionId>>()
  })

  it('cwd is a branded string usable with listSessions', () => {
    type ListFn = SessionRepositoryPort['listSessions']
    expectTypeOf<ListFn>().parameter(0).toMatchTypeOf<ReturnType<typeof cwd>>()
  })
})
