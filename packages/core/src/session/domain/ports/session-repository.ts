import type { SessionInfo } from '@earendil-works/pi-coding-agent'

import type { Cwd } from '../../../_shared/domain/cwd'
import type { SessionId } from '../../../_shared/domain/session-id'
import type { SessionContext, SessionEntry, SessionSearchResponse, SessionTreeNode } from '../types'

/**
 * SessionRepositoryPort — 读 session 列表 / 单个 session info 的端口。
 *
 * Mirror pi-web `lib/session-reader.ts:listAllSessions + listSessionSummaries`
 * 接口的 use-case 视角抽象（per plan §1C.2）。
 *
 * Phase 1 实际只 list-sessions 一个 use-case。其他方法（searchSessions,
 * readSessionInfo, listSessionsSummary）签名已定（forward compat for
 * Phase 2+ read-session-info / context / tree use-cases）。
 *
 * Phase 2 PR.C 2C.3 (read-side extensions):
 *   - readSessionContext  (UC-SES-06) — SessionContext for click-row detail panel
 *   - readSessionEntries  (UC-SES-07) — defensive copy of all entries
 *   - readSessionTree     (UC-SES-08) — tree view (defensive copy)
 *   - searchSessions      REWRITTEN (UC-SES-03) — Phase 1 placeholder → full-content search
 *
 * 设计理由（per capability-boundary-final §4.2）：
 * - `listSessions` 是核心（PR.A→C 主用例）
 * - `listSessionsSummary` 用 deferred details 优化 sidebar 启动速度
 * - `searchSessions` 给 Phase 2+ SessionSearch 组件
 * - `readSessionInfo` 给 click-row 详情面板（Phase 2+）
 */
export interface SessionRepositoryPort {
  /**
   * 列出 cwd 下所有 session 的完整 SessionInfo。
   * options.force = true 跳过 cache，强制 rescan。
   */
  listSessions(cwd: Cwd, options?: { force?: boolean }): Promise<SessionInfo[]>

  /**
   * 列出 cwd 下所有 session 的"摘要"版本（deferred details 优化）。
   * 首次 paint 时使用，详情到达后再替换。
   */
  listSessionsSummary(cwd: Cwd): Promise<SessionInfo[]>

  /**
   * 搜索 sessions matching query (Phase 2 PR.C 2C.3: signature BREAKING CHANGE).
   *
   * Phase 1:  searchSessions(cwd, query) → Promise<SessionInfo[]>  (placeholder)
   * Phase 2:  searchSessions(query)     → Promise<SessionSearchResponse>  (real)
   *
   * Per plan D-P2-3: Phase 1 was a placeholder; Phase 2 returns full-content
   * scan results (matches per entry, with snippet context).
   * Verified via rg "searchSessions\(" packages/ → 0 external callers
   * (only the placeholder impl + this port declaration).
   */
  searchSessions(query: string): Promise<SessionSearchResponse>

  /**
   * 读单个 session 的 SessionInfo（按 id）。
   * @returns null if session file missing / corrupted.
   */
  readSessionInfo(sessionId: SessionId): Promise<SessionInfo | null>

  // -----------------------------------------------------------------
  // Phase 2 PR.C 2C.3: read-side methods
  // -----------------------------------------------------------------

  /**
   * 读 session 的 message context（UC-SES-06）。
   *
   * Returns a SessionContext built via SDK buildSessionContext free fn.
   * Throws SessionNotFoundError if sessionId not found (per ADR 0003
   * — caller maps to 404, not null).
   * Throws SessionReadError on JSONL parse failure / SDK errors.
   *
   * @param options.leafId optional anchor — context starts at this entry's chain
   * @param options.before optional pagination cursor (Phase 3+ optimization)
   * @param options.tail max messages to return (default 50, hard cap 1000)
   */
  readSessionContext(
    sessionId: SessionId,
    options?: { leafId?: string | null; before?: string; tail?: number },
  ): Promise<SessionContext>

  /**
   * 读 session 的所有 entries（UC-SES-07）。
   * Defensive copy via SDK getEntries() — O(N) but bounded (Phase 2 minimum).
   * Throws SessionNotFoundError if not found.
   */
  readSessionEntries(sessionId: SessionId): Promise<SessionEntry[]>

  /**
   * 读 session 的 tree view（UC-SES-08）— fork / subagent relations.
   * Returns [] for sessions without fork/subagent structure.
   * Throws SessionNotFoundError if not found.
   */
  readSessionTree(sessionId: SessionId): Promise<SessionTreeNode[]>
}
