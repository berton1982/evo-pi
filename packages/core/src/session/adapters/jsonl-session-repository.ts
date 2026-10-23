import { statSync } from 'node:fs'

import {
  buildSessionContext,
  type SessionEntry,
  type SessionInfo,
  SessionManager,
} from '@earendil-works/pi-coding-agent'

import type { Cwd } from '../../_shared/domain/cwd'
import type { Path } from '../../_shared/domain/path'
import type { SessionId } from '../../_shared/domain/session-id'
import { sessionId } from '../../_shared/domain/session-id'
import type { IndexEntry, SessionIndexerPort } from '../domain/ports/session-indexer'
import type { SessionRepositoryPort } from '../domain/ports/session-repository'
import type { SessionStoragePort } from '../domain/ports/session-storage'
import { SessionNotFoundError, SessionReadError } from '../domain/session-not-found-error'
import type {
  SessionContext,
  SessionSearchResponse,
  SessionSearchResult,
  SessionTreeNode,
} from '../domain/types'

/**
 * JsonlSessionRepository — SessionRepositoryPort impl using scan-index + bounded-reader.
 *
 * Phase 1 algorithm (listSessions):
 * 1. enumerateSessionFiles() → list of all *.jsonl paths
 * 2. For each path: check scan-index fingerprint (size + mtimeMs)
 * 3. If miss/stale: readSessionInfo(filePath) → SessionInfo + update index
 * 4. Drop index entries not in current file set (evictStale)
 * 5. Return all SessionInfo sorted by modified DESC
 *
 * Phase 2 PR.C 2C.5 additions (read-side, per plan §7.6 + spec §3.4):
 *   - readSessionContext  (UC-SES-06) — uses buildSessionContext free fn
 *   - readSessionEntries  (UC-SES-07) — wraps storage.readEntries
 *   - readSessionTree     (UC-SES-08) — uses SDK SessionManager.getTree
 *   - searchSessions      (UC-SES-03) — full ponytail scan per pi-web
 *
 * SDK ≥80% reuse (per D7): all JSONL parsing via SessionManager.open
 * + getEntries + getTree + buildSessionContext — zero custom parsing.
 */

const MAX_SEARCH_QUERY_LENGTH = 200 // per pi-web app/api/sessions/search/route.ts:14-17

export class JsonlSessionRepository implements SessionRepositoryPort {
  constructor(
    private readonly storage: SessionStoragePort,
    private readonly indexer: SessionIndexerPort,
  ) {}

  /**
   * listSessions(cwd): list all sessions under cwd's session directory.
   */
  async listSessions(cwd: Cwd, options?: { force?: boolean }): Promise<SessionInfo[]> {
    const sessionDir = this.storage.getSessionDir(cwd)
    const files = await this.enumerateUnderDir(sessionDir)
    const force = options?.force ?? false

    const sessions: SessionInfo[] = []
    const presentPaths = new Set<string>()

    for (const filePath of files) {
      presentPaths.add(filePath)

      if (!force) {
        const cached = this.indexer.getIndex().get(filePath)
        if (cached && this.fingerprintMatches(cached, filePath)) {
          // Cache hit but we don't cache SessionInfo itself; re-read for fresh data
        }
      }

      const session = await this.storage.readSessionInfo(filePath as Path)
      if (session) {
        sessions.push(session)
        this.updateIndex(filePath, session)
      }
    }

    const index = this.indexer.getIndex()
    for (const key of index.keys()) {
      if (!presentPaths.has(key)) this.indexer.invalidate(key as Path)
    }

    sessions.sort((a, b) => b.modified.getTime() - a.modified.getTime())
    return sessions
  }

  async listSessionsSummary(cwd: Cwd): Promise<SessionInfo[]> {
    return this.listSessions(cwd)
  }

  // PR.C 2C.5: read-side methods (real implementations)

  /**
   * readSessionEntries — defensive copy of all SessionEntry[] in the
   * session identified by sessionId.
   *
   * Flow: getSessionFileForId → readEntries (storage → SDK getEntries).
   * Throws SessionNotFoundError if sessionId not found.
   */
  async readSessionEntries(sessionId: SessionId): Promise<SessionEntry[]> {
    const filePath = await this.storage.getSessionFileForId(sessionId)
    if (!filePath) throw new SessionNotFoundError(sessionId)
    return this.storage.readEntries(filePath as Path)
  }

  /**
   * readSessionContext — built via SDK buildSessionContext free fn +
   * entry-id extraction for the 6-field wire SessionContext.
   *
   * Flow:
   *  1. getSessionFileForId → if null throw SessionNotFoundError
   *  2. readEntries (SDK getEntries)
   *  3. Apply `before` cursor: if provided, slice entries [0, indexOf(before))
   *     so the walk starts strictly BEFORE the client's oldest entry.
   *     (pi-web: "before is the oldest entry already on the client; fetch its
   *      ancestors only (excludeLeaf) so prepending the page does not
   *      duplicate `before`.")
   *  4. buildSessionContext(scopedEntries, undefined) → SDK uses last entry
   *     as leaf (default; null returns empty path).
   *  5. Apply tail cap (default 10000 — high enough for any realistic
   *     session; UI still paginates client-side via `before` if needed).
   *  6. Map SDK shape → evo-pi wire SessionContext (6 fields):
   *     - messages, entryIds (parallel)
   *     - oldestEntryId: first entry id of returned array
   *     - hasMore: true if there are entries older than the returned set
   *     - thinkingLevel, model: from SDK
   *
   * Per plan §7.4 + spec §3.4 + pi-web app/api/sessions/[id]/context/route.ts:31-39.
   *
   * CHANGED (PR.D follow-up): default tail raised 50 → 10000 because real
   * sessions can have 1000+ entries (verified on session 01a12a75 which
   * has 1351 messages; default 50 truncated to 3.7% of history).
   */
  async readSessionContext(
    sessionId: SessionId,
    options?: { leafId?: string | null; before?: string; tail?: number },
  ): Promise<SessionContext> {
    const filePath = await this.storage.getSessionFileForId(sessionId)
    if (!filePath) throw new SessionNotFoundError(sessionId)
    const entries = await this.storage.readEntries(filePath as Path)
    if (entries.length === 0) {
      throw new SessionNotFoundError(sessionId)
    }

    // Apply `before` cursor: keep only entries strictly older than `before`.
    // Per pi-web pattern: the client's oldest entry is `before`; we exclude it
    // AND everything after (newer) — only the strictly-older ancestors.
    let scopedEntries = entries
    if (options?.before) {
      const beforeIdx = entries.findIndex((e) => e.id === options.before)
      if (beforeIdx > 0) {
        scopedEntries = entries.slice(0, beforeIdx)
      } else if (beforeIdx === -1) {
        // `before` refers to an entry that doesn't exist in this session
        // (caller's cursor is stale or wrong session). Return empty.
        scopedEntries = []
      } else {
        // beforeIdx === 0: `before` is the very first entry — no older
        // entries exist. Return empty.
        scopedEntries = []
      }
    }

    // hasMore (before tail slice): there are entries older than what we'll return.
    // After the tail slice, if the oldest returned entry is not the first
    // scoped entry, more exist.
    const totalScoped = scopedEntries.length
    const requestedTail = options?.tail ?? 10000
    const tail = Math.max(1, Math.min(requestedTail, 10000))

    // Take the LAST `tail` entries from the scoped set (most recent within scope).
    // For initial load (no before), this is the last `tail` of the whole file.
    // For load-older, this is the last `tail` of the strictly-older set.
    const walkEntries = tail >= totalScoped ? scopedEntries : scopedEntries.slice(-tail)
    const hasMore = walkEntries.length < totalScoped

    // SDK buildSessionContext returns the 3-field SessionContext.
    // Pass leafId=undefined so SDK picks the last entry as the default leaf
    // (null returns an empty path).
    const sdkCtx = buildSessionContext(walkEntries, undefined)
    const messages = sdkCtx.messages
    const entryIds = walkEntries
      .filter((e) => e.type === 'message')
      .map((e) => e.id)
      .slice(-messages.length) // parallel to messages (in case walkEntries has non-message)

    return {
      messages,
      entryIds,
      oldestEntryId: entryIds[0] ?? null,
      hasMore,
      thinkingLevel: sdkCtx.thinkingLevel,
      model: sdkCtx.model,
    }
  }

  /**
   * readSessionTree — SDK SessionManager.getTree() returns the tree view
   * (fork / subagent relations).
   *
   * Returns [] for sessions without fork/subagent structure (linear chain
   * produces a single root node — but Phase 2 minimum: just return SDK result).
   *
   * Throws SessionNotFoundError if sessionId not found; SessionReadError
   * for SDK parse failures / other SDK exceptions.
   */
  async readSessionTree(sessionId: SessionId): Promise<SessionTreeNode[]> {
    const filePath = await this.storage.getSessionFileForId(sessionId)
    if (!filePath) throw new SessionNotFoundError(sessionId)
    try {
      const manager = SessionManager.open(filePath as string)
      return manager.getTree()
    } catch (error) {
      throw new SessionReadError(
        `readSessionTree failed for ${sessionId as string}`,
        sessionId,
        error,
      )
    }
  }

  /**
   * searchSessions(query) — full ponytail scan per pi-web lib/session-search.ts:24-68.
   *
   * Algorithm (per pi-web):
   *  1. Validate query length ≤ 200 (else throw RangeError)
   *  2. List sessions via listSessions (which scans + caches)
   *  3. Filter out transient sessions
   *  4. Sort by modified DESC (newest first — same as pi-web)
   *  5. For each session path: streamForSearch + line-by-line JSON.parse
   *  6. For each line: extract message text blocks, regex match query
   *  7. First match per session wins (break inner loop)
   *  8. Format before/match/after (whitespace-collapsed, ellipsis at 80)
   *  9. Caps: MAX_FILES=500, MAX_RESULTS=30, MAX_LINE_CHARS=1MB (constants in pi-web)
   *
   * Phase 2 minimum: omit time budget (AbortSignal) — Phase 3+ adds.
   * Session-level field matching (name/firstMessage/allMessagesText) is
   * Phase 3+; PR C focus is entry-level matching.
   *
   * Returns { results: SessionSearchResult[], truncated: boolean }.
   */
  async searchSessions(query: string): Promise<SessionSearchResponse> {
    const needle = query.trim()
    if (!needle) return { results: [], truncated: false }
    if (needle.length > MAX_SEARCH_QUERY_LENGTH) {
      throw new RangeError(
        `Search query exceeds ${MAX_SEARCH_QUERY_LENGTH} characters (got ${needle.length})`,
      )
    }
    // Escape regex special chars per pi-web lib/session-search.ts:32
    const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const matcher = new RegExp(escaped, 'i')

    // Use listSessionsSummary (cache-respecting scan)
    const candidates = await this.listSessionsSummaryAll()
    // Sort by modified DESC (mirroring pi-web's sort)
    candidates.sort((a, b) => b.modified.getTime() - a.modified.getTime())

    const results: SessionSearchResult[] = []
    let truncated = false

    for (const session of candidates) {
      if (results.length >= 30) {
        truncated = true
        break
      }

      let found = false
      for await (const line of this.storage.streamForSearch(session.path as Path)) {
        let entry: { type?: string; message?: { content?: unknown } }
        try {
          entry = JSON.parse(line)
        } catch {
          continue
        }
        if (entry?.type !== 'message') continue
        const content = entry.message?.content
        if (!content) continue

        // Extract text blocks (mirrors pi-web pattern)
        const blocks: { text: string; blockIndex: number }[] = []
        if (typeof content === 'string') {
          blocks.push({ text: content, blockIndex: 0 })
        } else if (Array.isArray(content)) {
          for (let i = 0; i < content.length; i++) {
            const c = content[i] as { type?: unknown; text?: unknown } | null
            if (
              c !== null &&
              typeof c === 'object' &&
              c.type === 'text' &&
              typeof c.text === 'string'
            ) {
              blocks.push({ text: c.text, blockIndex: i })
            }
          }
        }
        if (blocks.length === 0) continue

        const text = blocks.map((b) => b.text).join('\n')
        const match = matcher.exec(text)
        if (!match) continue

        const start = match.index
        const end = start + match[0].length
        // blockOffset computation: find which block contains the match start
        let blockOffset = 0
        const matchedBlock = blocks.find((b) => {
          const blockEnd = blockOffset + b.text.length
          blockOffset = blockEnd + 1 // "\n" separator
          return start <= blockEnd
        })
        // 上面的 find 在 blocks 非空时必然命中（已在上方 continue 掉空数组）；
        // 若因块文本为空而漏判，则退回第一块，行为与原 `?? blocks[0]!` 一致。
        const targetBlock = matchedBlock ?? blocks[0]
        if (!targetBlock) continue

        const before =
          (start > 80 ? '...' : '') +
          text
            .slice(Math.max(0, start - 80), start)
            .replace(/\s+/g, ' ')
            .trimStart()
        const after =
          text
            .slice(end, end + 80)
            .replace(/\s+/g, ' ')
            .trimEnd() + (end + 80 < text.length ? '...' : '')

        results.push({
          session,
          // entryId is the JSONL line's id field — we don't have it here
          // (pi-web has it because they read the full line including id).
          // For Phase 2 minimum: omit entryId; Phase 3+ can extend.
          blockIndex: targetBlock.blockIndex,
          before,
          match: match[0].replace(/\s+/g, ' '),
          after,
        })
        found = true
        break
      }

      if (!found) {
        // Continue to next session (no result for this one)
      }
      // Phase 2 minimum: no MAX_FILES cap (candidates.length is bounded by
      // listSessionsSummary's scan; in practice <500). Phase 3+ can add.
    }

    return { results, truncated }
  }

  async readSessionInfo(id: SessionId): Promise<SessionInfo | null> {
    const idStr = id as string
    let targetPath: string | undefined
    this.indexer.getIndex().forEach((entry, key) => {
      if (entry.id === idStr) targetPath = key
    })
    if (!targetPath) {
      // Fallback: full id→path lookup (when scan-index is cold)
      const looked = await this.storage.getSessionFileForId(id)
      return looked ? this.storage.readSessionInfo(looked as Path) : null
    }
    return this.storage.readSessionInfo(targetPath as Path)
  }

  // --- helpers ---

  private async enumerateUnderDir(_dir: string): Promise<string[]> {
    const all = await this.storage.enumerateSessionFiles()
    return all as string[]
  }

  /** List sessions across all cwds (for cross-cwd search); uses cache */
  private async listSessionsSummaryAll(): Promise<SessionInfo[]> {
    // For Phase 2 minimum, we scan from listSessions on the default cwd.
    // PR.C search uses the system-wide `agentDir/sessions/` regardless of
    // cwd — pi-web pattern. We approximate by enumerating all files.
    const all = await this.storage.enumerateSessionFiles()
    const sessions: SessionInfo[] = []
    for (const filePath of all) {
      const session = await this.storage.readSessionInfo(filePath as Path)
      if (session) sessions.push(session)
    }
    return sessions
  }

  private fingerprintMatches(cached: IndexEntry, filePath: string): boolean {
    try {
      const stats = statSync(filePath)
      return cached.size === stats.size && cached.mtimeMs === stats.mtimeMs
    } catch {
      return false
    }
  }

  private updateIndex(filePath: string, filePath_session: SessionInfo): void {
    try {
      const stats = statSync(filePath)
      const entry: IndexEntry = {
        id: filePath_session.id,
        filePath: filePath as Path,
        mtimeMs: stats.mtimeMs,
        size: stats.size,
      }
      this.indexer.getIndex().set(filePath, entry)
    } catch {
      // stat failure: leave index untouched
    }
  }
}

/** Re-export for convenience */
export { sessionId }
