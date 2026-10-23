import type { SessionInfo } from '@earendil-works/pi-coding-agent'

import {
  InMemoryIndexer,
  InMemorySessionRepository,
  InMemorySessionStorage,
} from '../adapters/in-memory-session-repository'
import type { SessionRepositoryPort } from '../domain/ports/session-repository'

/**
 * __test-helpers__ — common test setup for session use-case tests.
 *
 * Per Phase 0 convention (per `packages/core/src/_shared/domain/__test-helpers__.ts`
 * pattern): test helpers live next to the code they test, exported for reuse.
 *
 * Provides:
 * - makeInMemoryRepo() — returns { repo, storage, indexer } all wired up
 * - makeSession() — factory for SessionInfo with sensible defaults
 *
 * Use-case tests construct repo + use-case together to verify the
 * business logic (port injection + delegation) without fs / SDK dependency.
 */

export interface InMemoryRepoBundle {
  repo: SessionRepositoryPort
  storage: InMemorySessionStorage
  indexer: InMemoryIndexer
  repoWritable: InMemorySessionRepository
}

export function makeInMemoryRepo(): InMemoryRepoBundle {
  const indexer = new InMemoryIndexer()
  const storage = new InMemorySessionStorage()
  const repoWritable = new InMemorySessionRepository(storage, indexer)
  // The constructor wires storage.setSessionsByPath(repo.sessionsByPath) so
  // storage.readSessionInfo and storage.enumerateSessionFiles work.
  return {
    repo: repoWritable,
    repoWritable,
    storage,
    indexer,
  }
}

export function makeSession(overrides: Partial<SessionInfo> = {}): SessionInfo {
  return {
    id: 'sess-1',
    cwd: '/Users/test/proj',
    created: new Date('2025-01-01T00:00:00Z'),
    modified: new Date('2025-01-02T00:00:00Z'),
    messageCount: 1,
    firstMessage: 'hello',
    allMessagesText: '',
    path: '/sessions/sess-1.jsonl',
    ...overrides,
  }
}
