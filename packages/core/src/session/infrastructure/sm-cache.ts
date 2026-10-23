import { SessionManager } from '@earendil-works/pi-coding-agent'

import type { Cwd } from '../../_shared/domain/cwd'

/**
 * SmCache — LRU cache for SDK SessionManager instances.
 *
 * Why cache: SessionManager.open(filePath) re-parses the JSONL header on every
 * call. For Phase 1 use-case (listSessions enumerates N JSONL files), without
 * cache we'd re-parse N times on every list call. LRU keeps hot sessions warm.
 *
 * pi-web has no dedicated sm-cache file (creates SessionManager inline at
 * `lib/rpc-manager.ts:2317,958` and `lib/subagent-runtime.ts:301`). evo-pi
 * adds explicit cache since:
 * - Phase 1 list-sessions is read-heavy (no writes)
 * - LRU prevents memory bloat from unused cwd entries
 *
 * Cache strategy: cache by absolute JSONL path (file path is unique per session).
 * Same cwd can have many sessions; caching by cwd would conflate them.
 *
 * Phase 1 简化：plain Map with size limit (no LRU recency tracking — list-sessions
 * is bulk-enumerate, not per-row access; recency doesn't help much).
 * Phase 2+ add LRU recency if needed.
 */

/** Default max cache size (per study #3 §3.3.1 — ~256 sessions = ~256MB) */
export const DEFAULT_SM_CACHE_SIZE = 256

export class SmCache {
  private cache = new Map<string, SessionManager>()

  constructor(private readonly maxSize: number = DEFAULT_SM_CACHE_SIZE) {}

  get size(): number {
    return this.cache.size
  }

  /** Get cached SessionManager for a JSONL file path; opens if missing. */
  getOrOpen(filePath: string): SessionManager {
    const cached = this.cache.get(filePath)
    if (cached) return cached

    // SDK opens file, parses header + entries
    const manager = SessionManager.open(filePath)

    // Evict oldest if over capacity (insertion order = LRU for Map)
    while (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey === undefined) break
      this.cache.delete(oldestKey)
    }

    this.cache.set(filePath, manager)
    return manager
  }

  /** Get cached SessionManager for a cwd (creates new if missing). */
  getOrCreate(cwd: Cwd, sessionDir?: string): SessionManager {
    // Cache key includes sessionDir to distinguish same-cwd different-session-dir
    const key = `cwd:${cwd}:${sessionDir ?? ''}`
    const cached = this.cache.get(key)
    if (cached) return cached

    const manager = SessionManager.create(cwd, sessionDir)

    while (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey === undefined) break
      this.cache.delete(oldestKey)
    }

    this.cache.set(key, manager)
    return manager
  }

  /** Invalidate a cached entry (e.g., file modified on disk) */
  invalidate(filePath: string): void {
    this.cache.delete(filePath)
  }

  /** Drop everything (e.g., on agentDir change) */
  clear(): void {
    this.cache.clear()
  }
}
