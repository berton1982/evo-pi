import type { SessionEntry, SessionInfo } from '@earendil-works/pi-coding-agent'

import type { Cwd } from '../../_shared/domain/cwd'
import type { Path } from '../../_shared/domain/path'
import type { SessionId } from '../../_shared/domain/session-id'
import type { IndexMap, SessionIndexerPort } from '../domain/ports/session-indexer'
import type { SessionRepositoryPort } from '../domain/ports/session-repository'
import type { SessionStoragePort } from '../domain/ports/session-storage'

/**
 * InMemorySessionRepository — SessionRepositoryPort test fake.
 *
 * Phase 1 use cases:
 * - list-sessions use-case test (no fs / SDK dependency)
 * - Phase 2+ SessionRepository tests
 *
 * Holds sessions in a Map<path, SessionInfo>. No filesystem; storage / indexer
 * are pure in-memory fakes (all share the same sessionsByPath map).
 */

export class InMemorySessionRepository implements SessionRepositoryPort {
  /** Shared with InMemorySessionStorage via setStorageReference. */
  private sessionsByPath = new Map<string, SessionInfo>()

  constructor(
    private readonly storage: InMemorySessionStorage,
    private readonly indexer: SessionIndexerPort,
  ) {
    // Wire storage to read from our map (avoids private-field access hack)
    this.storage.setSessionsByPath(this.sessionsByPath)
  }

  setSession(path: string, info: SessionInfo): void {
    this.sessionsByPath.set(path, info)
  }

  async listSessions(_cwd: Cwd, _options?: { force?: boolean }): Promise<SessionInfo[]> {
    const sessions = Array.from(this.sessionsByPath.values())
    return sessions.sort((a, b) => b.modified.getTime() - a.modified.getTime())
  }

  async listSessionsSummary(cwd: Cwd): Promise<SessionInfo[]> {
    return this.listSessions(cwd)
  }

  async searchSessions(_query: string): Promise<{ results: []; truncated: boolean }> {
    // PR.C 2C.3: stub for read-side; real impl not needed for in-memory fake
    return { results: [], truncated: false }
  }

  async readSessionInfo(sessionId: SessionId): Promise<SessionInfo | null> {
    const target = sessionId as string
    for (const session of this.sessionsByPath.values()) {
      if (session.id === target) return session
    }
    return null
  }

  /** Expose underlying fakes for test setup */
  getStorage(): InMemorySessionStorage {
    return this.storage
  }
  getIndexer(): SessionIndexerPort {
    return this.indexer
  }

  // PR.C 2C.3: read-side stubs (real impl deferred to JsonlSessionRepository 2C.5)
  async readSessionContext(_sessionId: SessionId): Promise<never> {
    throw new Error(
      'readSessionContext not implemented in InMemorySessionRepository (use real adapter)',
    )
  }
  async readSessionEntries(_sessionId: SessionId): Promise<never[]> {
    return []
  }
  async readSessionTree(_sessionId: SessionId): Promise<never[]> {
    return []
  }
}

/**
 * InMemorySessionStorage — SessionStoragePort test fake.
 *
 * Holds its own session map (set externally via setSessionsByPath so we don't
 * need private-field access hacks).
 */
export class InMemorySessionStorage implements SessionStoragePort {
  private pathsByCwd = new Map<string, string>()
  private sessionsByPathRef: Map<string, SessionInfo> | null = null

  setSessionDir(cwd: Cwd, dirPath: string): void {
    this.pathsByCwd.set(cwd as string, dirPath)
  }

  /** Called by InMemorySessionRepository constructor — wires shared session map. */
  setSessionsByPath(map: Map<string, SessionInfo>): void {
    this.sessionsByPathRef = map
  }

  getSessionDir(cwd: Cwd): string {
    return this.pathsByCwd.get(cwd as string) ?? `/fake/agent/sessions/${cwd}`
  }

  async readSessionInfo(filePath: Path): Promise<SessionInfo | null> {
    if (!this.sessionsByPathRef) return null
    return this.sessionsByPathRef.get(filePath as string) ?? null
  }

  async enumerateSessionFiles(): Promise<Path[]> {
    if (!this.sessionsByPathRef) return []
    return Array.from(this.sessionsByPathRef.keys()) as Path[]
  }

  // PR.C 2C.2: read-side stubs (real impl in FileSystemSessionStorage 2C.4)
  // In-memory fake returns empty defaults — read-side use-cases hit the real
  // adapter in integration tests, not the in-memory fake.
  async readEntries(_filePath: Path): Promise<SessionEntry[]> {
    return []
  }

  async getSessionFileForId(_sessionId: SessionId): Promise<string | null> {
    return null
  }

  async *streamForSearch(_filePath: Path, _signal?: AbortSignal): AsyncIterable<string> {
    // Empty: no lines to stream from an in-memory fake
  }
}

/**
 * InMemoryIndexer — SessionIndexerPort test fake.
 *
 * Just wraps a Map<string, IndexEntry>. Persist is a no-op (in-memory).
 */
export class InMemoryIndexer implements SessionIndexerPort {
  private map: IndexMap = new Map()
  getIndex(): IndexMap {
    return this.map
  }
  invalidate(filePath?: Path): void {
    if (filePath === undefined) {
      this.map = new Map()
    } else {
      this.map.delete(filePath as string)
    }
  }
  async persist(): Promise<void> {
    // no-op
  }
}
