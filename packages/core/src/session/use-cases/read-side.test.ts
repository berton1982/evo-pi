/**
 * read-side use-cases contract test — verifies factory-pattern use-cases
 * correctly delegate to repo ports.
 *
 * Per ADR 0003, use-cases are thin pass-throughs to ports. The test
 * verifies the factory creates a working function with the documented
 * signature, and that the result flows through to the repo.
 *
 * This is a smoke test — the real behavior (e.g., SessionContext
 * shape, search algorithm) is covered by the adapter tests in
 * packages/core/src/session/adapters/jsonl-session-repository.test.ts.
 *
 * @vitest-environment node
 */

import type { SessionInfo } from '@earendil-works/pi-coding-agent'
import { describe, expect, it } from 'vitest'
import { sessionId } from '../../_shared/domain/session-id'
import type { SessionRepositoryPort } from '../domain/ports/session-repository'
import type {
  SessionContext,
  SessionEntry,
  SessionSearchResponse,
  SessionTreeNode,
} from '../domain/types'

import {
  makeReadSessionContext,
  makeReadSessionEntries,
  makeReadSessionInfo,
  makeReadSessionTree,
  makeSearchSessions,
} from './index'

function makeFakeRepo(): SessionRepositoryPort & {
  __calls: { method: string; args: unknown[] }[]
} {
  const calls: { method: string; args: unknown[] }[] = []
  const sampleEntries: SessionEntry[] = [
    {
      type: 'message',
      id: 'e1',
      parentId: null,
      timestamp: 't',
      message: { role: 'user', content: [{ type: 'text', text: 'hi' }], timestamp: 1 },
    },
  ]
  const sampleSessionInfo: SessionInfo = {
    id: 'sess-1',
    cwd: '/x',
    path: '/x.jsonl',
    created: new Date(),
    modified: new Date(),
    messageCount: 1,
    firstMessage: 'hi',
    allMessagesText: '',
  }
  const sampleContext: SessionContext = {
    messages: [{ role: 'user', content: [{ type: 'text', text: 'hi' }], timestamp: 1 }],
    entryIds: ['e1'],
    oldestEntryId: 'e1',
    hasMore: false,
    thinkingLevel: 'off',
    model: { provider: 'p', modelId: 'm' },
  }
  const sampleTree: SessionTreeNode[] = [{ entry: sampleEntries[0]!, children: [] }]
  const sampleSearch: SessionSearchResponse = {
    results: [
      {
        session: sampleSessionInfo,
        entryId: 'e1',
        blockIndex: 0,
        before: '',
        match: 'hi',
        after: '',
      },
    ],
    truncated: false,
  }

  return {
    listSessions: async () => [],
    listSessionsSummary: async () => [],
    searchSessions: async (q: string) => {
      calls.push({ method: 'searchSessions', args: [q] })
      return sampleSearch
    },
    readSessionInfo: async (id: typeof sampleSessionInfo.id) => {
      calls.push({ method: 'readSessionInfo', args: [id] })
      return sampleSessionInfo
    },
    readSessionContext: async (id: unknown, opts: unknown) => {
      calls.push({ method: 'readSessionContext', args: [id, opts] })
      return sampleContext
    },
    readSessionEntries: async (id: unknown) => {
      calls.push({ method: 'readSessionEntries', args: [id] })
      return sampleEntries
    },
    readSessionTree: async (id: unknown) => {
      calls.push({ method: 'readSessionTree', args: [id] })
      return sampleTree
    },
    __calls: calls,
  } as unknown as SessionRepositoryPort & { __calls: typeof calls }
}

describe('read-side use-cases (factory pattern)', () => {
  it('makeReadSessionInfo delegates to repo with sessionId', async () => {
    const repo = makeFakeRepo()
    const useCase = makeReadSessionInfo({ repo: repo as unknown as SessionRepositoryPort })
    const result = await useCase(sessionId('sess-1'))
    expect(result?.id).toBe('sess-1')
    expect(repo.__calls[0]?.method).toBe('readSessionInfo')
  })

  it('makeReadSessionContext delegates to repo with options', async () => {
    const repo = makeFakeRepo()
    const useCase = makeReadSessionContext({
      repo: repo as unknown as SessionRepositoryPort,
    })
    const ctx = await useCase(sessionId('sess-1'), { leafId: 'e2', tail: 10 })
    expect(ctx.messages.length).toBe(1)
    expect(ctx.model?.provider).toBe('p')
    expect(repo.__calls[0]?.args).toEqual([expect.anything(), { leafId: 'e2', tail: 10 }])
  })

  it('makeReadSessionEntries delegates to repo', async () => {
    const repo = makeFakeRepo()
    const useCase = makeReadSessionEntries({
      repo: repo as unknown as SessionRepositoryPort,
    })
    const entries = await useCase(sessionId('sess-1'))
    expect(entries.length).toBe(1)
    expect(repo.__calls[0]?.method).toBe('readSessionEntries')
  })

  it('makeReadSessionTree delegates to repo', async () => {
    const repo = makeFakeRepo()
    const useCase = makeReadSessionTree({
      repo: repo as unknown as SessionRepositoryPort,
    })
    const tree = await useCase(sessionId('sess-1'))
    expect(tree.length).toBe(1)
    expect(repo.__calls[0]?.method).toBe('readSessionTree')
  })

  it('makeSearchSessions delegates to repo with query', async () => {
    const repo = makeFakeRepo()
    const useCase = makeSearchSessions({ repo: repo as unknown as SessionRepositoryPort })
    const result = await useCase('hello')
    expect(result.results.length).toBe(1)
    expect(result.results[0]?.match).toBe('hi')
    expect(repo.__calls[0]?.method).toBe('searchSessions')
    expect(repo.__calls[0]?.args).toEqual(['hello'])
  })
})
