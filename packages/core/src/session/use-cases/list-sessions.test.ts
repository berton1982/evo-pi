import type { SessionInfo } from '@earendil-works/pi-coding-agent'
import { describe, expect, it } from 'vitest'

import { cwd as makeCwd } from '../../_shared/domain/cwd'
import { makeInMemoryRepo, makeSession } from './__test-helpers__'
import { makeListSessions } from './list-sessions'

describe('listSessions use-case (PR.C.5)', () => {
  it('returns sessions from the injected repository', async () => {
    const { repo, repoWritable } = makeInMemoryRepo()
    repoWritable.setSession('/a.jsonl', makeSession({ id: 'a' }))
    repoWritable.setSession('/b.jsonl', makeSession({ id: 'b' }))

    const listSessions = makeListSessions({ repo })
    const result = await listSessions(makeCwd('/Users/test/proj'))
    expect(result).toHaveLength(2)
    const ids = result.map((s) => s.id).sort()
    expect(ids).toEqual(['a', 'b'])
  })

  it('returns empty array when no sessions', async () => {
    const { repo } = makeInMemoryRepo()
    const listSessions = makeListSessions({ repo })
    const result = await listSessions(makeCwd('/Users/empty'))
    expect(result).toEqual([])
  })

  it('forwards options.force to repository', async () => {
    let receivedOptions: { force?: boolean } | undefined
    const fakeRepo: import('../domain/ports/session-repository').SessionRepositoryPort = {
      listSessions: async (_cwd, options) => {
        receivedOptions = options
        return [] as SessionInfo[]
      },
      listSessionsSummary: async () => [],
      searchSessions: async () => ({ results: [], truncated: false }),
      readSessionInfo: async () => null,
      readSessionContext: async () => ({
        messages: [],
        entryIds: [],
        oldestEntryId: null,
        hasMore: false,
        thinkingLevel: 'off',
        model: null,
      }),
      readSessionEntries: async () => [],
      readSessionTree: async () => [],
    }

    const listSessions = makeListSessions({ repo: fakeRepo })
    await listSessions(makeCwd('/x'), { force: true })
    expect(receivedOptions).toEqual({ force: true })
  })

  it('sessions are sorted by modified DESC (delegated from in-memory adapter)', async () => {
    const { repo, repoWritable } = makeInMemoryRepo()
    repoWritable.setSession(
      '/old.jsonl',
      makeSession({ id: 'old', modified: new Date('2025-01-01') }),
    )
    repoWritable.setSession(
      '/new.jsonl',
      makeSession({ id: 'new', modified: new Date('2025-01-05') }),
    )
    repoWritable.setSession(
      '/mid.jsonl',
      makeSession({ id: 'mid', modified: new Date('2025-01-03') }),
    )

    const listSessions = makeListSessions({ repo })
    const result = await listSessions(makeCwd('/x'))
    expect(result.map((s) => s.id)).toEqual(['new', 'mid', 'old'])
  })

  it('can be called multiple times (no state pollution between calls)', async () => {
    // 用纯 fakeRepo：本例只关心重复调用之间无状态残留，不需要真实仓库
    let callCount = 0
    const fakeRepo: import('../domain/ports/session-repository').SessionRepositoryPort = {
      listSessions: async () => {
        callCount += 1
        return [makeSession({ id: `s${callCount}` })]
      },
      listSessionsSummary: async () => [],
      searchSessions: async () => ({ results: [], truncated: false }),
      readSessionInfo: async () => null,
      readSessionContext: async () => ({
        messages: [],
        entryIds: [],
        oldestEntryId: null,
        hasMore: false,
        thinkingLevel: 'off',
        model: null,
      }),
      readSessionEntries: async () => [],
      readSessionTree: async () => [],
    }

    const listSessions = makeListSessions({ repo: fakeRepo })
    await listSessions(makeCwd('/x'))
    await listSessions(makeCwd('/y'))
    expect(callCount).toBe(2)
  })
})
