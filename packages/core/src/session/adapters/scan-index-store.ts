import type { Path } from '../../_shared/domain/path'
import type { IndexEntry, IndexMap, SessionIndexerPort } from '../domain/ports/session-indexer'
import { loadPersistedIndex, persistIndex, ScanIndexCache } from '../infrastructure/index'

/**
 * ScanIndexStore — ScanIndexCache (in-memory) + ScanIndexStorage (persisted) composite.
 *
 * Phase 1 (per plan §7.6):
 * - getIndex: returns in-memory cache
 * - invalidate(filePath?): drops cache entry(ies)
 * - persist(): writes cache to disk
 *
 * Debouncing: caller should debounce `persist()` calls (1C.4 adapter does this).
 * Phase 2+ can add atomic flush on process exit.
 *
 * Phase 1 simple model: in-memory cache always reflects last persist (no
 * "unsaved changes" tracking — persist is the boundary).
 */

export class ScanIndexStore implements SessionIndexerPort {
  private readonly cache: ScanIndexCache
  private readonly agentDir: string
  /** Debounce timer (Phase 1 simple setTimeout). */
  private persistTimer: ReturnType<typeof setTimeout> | null = null
  private static readonly PERSIST_DEBOUNCE_MS = 500

  constructor(agentDir: string) {
    this.agentDir = agentDir
    // Warm-load persisted index from disk
    const persisted = loadPersistedIndex(agentDir)
    this.cache = new ScanIndexCache()
    for (const [key, entry] of persisted) {
      this.cache.set(key, entry)
    }
  }

  getIndex(): IndexMap {
    return this.cache.getAll()
  }

  invalidate(filePath?: Path): void {
    if (filePath === undefined) {
      this.cache.invalidate()
    } else {
      this.cache.invalidate(filePath as string)
    }
    this.schedulePersist()
  }

  /**
   * Public method to explicitly trigger persist (sync).
   * Adapter calls this on scan completion.
   */
  persist(): Promise<void> {
    if (this.persistTimer !== null) {
      clearTimeout(this.persistTimer)
      this.persistTimer = null
    }
    persistIndex(this.agentDir, this.cache.getAll())
    return Promise.resolve()
  }

  /** Public accessor for cache (so adapter can call set/evictStale) */
  getCache(): ScanIndexCache {
    return this.cache
  }

  /**
   * Debounced persist: schedule write 500ms after last invalidate.
   * Avoids thrashing disk on rapid mutations.
   */
  private schedulePersist(): void {
    if (this.persistTimer !== null) clearTimeout(this.persistTimer)
    this.persistTimer = setTimeout(() => {
      this.persistTimer = null
      persistIndex(this.agentDir, this.cache.getAll())
    }, ScanIndexStore.PERSIST_DEBOUNCE_MS)
  }
}

/** Re-export IndexEntry for convenience */
export type { IndexEntry }
