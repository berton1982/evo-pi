import type { IndexEntry, IndexMap } from '../domain/ports/session-indexer'

/**
 * ScanIndexCache — in-memory scan-index with LRU + memory pressure eviction.
 *
 * Phase 1 minimum: plain Map with size limit. Eviction strategy per D17:
 *   "memory pressure" → LRU evict oldest 10% when size > EVICTION_THRESHOLD
 *
 * pi-web's eviction (per `lib/session-list-scanner.ts:listSessionsIncremental`):
 *   stale-entry evict (entries not in present set deleted). No size limit.
 *
 * evo-pi adds: stale-evict + memory-pressure LRU as belt-and-suspenders.
 * Evicted entries are NOT lost — still on disk, fingerprint rebuild on next scan.
 *
 * Why MRU not pure LRU: access order tracking is cheap (insertion-order Map).
 * Map iteration order = insertion order in JS. "Evict oldest" = delete oldest
 * Map entry by iteration order.
 */

/** Hard cap on index size (per D17 EVICTION_THRESHOLD = 1000) */
export const EVICTION_THRESHOLD = 1000

/** Fraction of entries to evict when threshold exceeded (10%) */
export const EVICTION_FRACTION = 0.1

export class ScanIndexCache {
  private entries: IndexMap = new Map()

  /** Number of entries currently cached */
  get size(): number {
    return this.entries.size
  }

  /** Read-only view of current entries */
  getAll(): IndexMap {
    return this.entries
  }

  /** Get entry by path; updates LRU recency via re-set */
  get(filePath: string): IndexEntry | undefined {
    const entry = this.entries.get(filePath)
    if (entry) {
      // Refresh recency: re-set (Map iteration order updates)
      this.entries.delete(filePath)
      this.entries.set(filePath, entry)
    }
    return entry
  }

  /** Set/overwrite entry; updates LRU recency */
  set(filePath: string, entry: IndexEntry): void {
    if (this.entries.has(filePath)) {
      this.entries.delete(filePath)
    }
    this.entries.set(filePath, entry)
    this.evictIfMemoryPressure()
  }

  /** Invalidate entry (or whole index if filePath undefined) */
  invalidate(filePath?: string): void {
    if (filePath === undefined) {
      this.entries.clear()
      return
    }
    this.entries.delete(filePath)
  }

  /**
   * Drop stale entries not present in the current file enumeration.
   * Called by adapter after enumerateSessionFiles() to clean up removed files.
   */
  evictStale(present: ReadonlySet<string>): void {
    for (const key of this.entries.keys()) {
      if (!present.has(key)) this.entries.delete(key)
    }
  }

  /**
   * LRU evict oldest 10% when size exceeds EVICTION_THRESHOLD.
   *
   * Map iteration order = insertion order (newest last). "Oldest" = first in
   * iteration. We delete from start until size drops below threshold.
   */
  evictIfMemoryPressure(): void {
    if (this.entries.size <= EVICTION_THRESHOLD) return
    const targetEvictCount = Math.floor(EVICTION_THRESHOLD * EVICTION_FRACTION)
    const keysToEvict: string[] = []
    for (const key of this.entries.keys()) {
      keysToEvict.push(key)
      if (keysToEvict.length >= targetEvictCount) break
    }
    for (const key of keysToEvict) {
      this.entries.delete(key)
    }
  }
}
