/**
 * types — Phase 2 read-side domain types (PR.C 2C.1).
 *
 * Barrel for all read-side domain types. Two patterns:
 *
 * 1. Re-export from SDK as-is (when SDK shape matches our needs):
 *    - AgentMessage       (from @earendil-works/pi-agent-core — lower-level)
 *    - SessionEntry       (from @earendil-works/pi-coding-agent)
 *    - SessionTreeNode    (from @earendil-works/pi-coding-agent)
 *
 * 2. Define locally with the evo-pi shape (when SDK is narrower than our
 *    use-case needs):
 *    - SessionContext      (SDK has only 3 fields; we need 6 per pi-web wire)
 *    - SessionSearchResult (not in SDK; pi-web defines it locally too)
 *    - SessionSearchResponse (same)
 *
 * Why SessionContext is local (not re-exported from SDK):
 *   SDK's @earendil-works/pi-coding-agent SessionContext has only
 *   { messages, thinkingLevel, model }. pi-web extends it with
 *   { entryIds, oldestEntryId, hasMore } for the wire contract
 *   (per ref_projects/pi-web/lib/types.ts:397-410). Our route
 *   handlers (Task 2C.7) return this extended shape, so the domain
 *   layer needs the full 6-field type.
 *
 * JSONL schema v3 compatibility (per study #4 §5.1):
 *   SessionEntry is the union of 11 variants per SDK v1.1.0
 *   session-manager.d.ts:128. We don't add new variants; PR.C 2C.4
 *   adapter reads them as-is via SDK's buildSessionContext free fn.
 *
 * Cross-validation source (per spec §3.4):
 *   ref_projects/pi-web/lib/types.ts:397-410 (SessionContext shape)
 *   ref_projects/pi-web/lib/session-search.ts:11-23 (SearchResult/Response)
 *   ref_projects/pi-web/lib/types.ts:131-138 (SessionTreeNode)
 */

// SDK re-exports (also imported locally so we can reference them in
// this file's own type definitions below — `export type {...} from` is
// re-export only, doesn't make the name available in this scope).
import type { AgentMessage } from '@earendil-works/pi-agent-core'
import type { SessionEntry, SessionTreeNode } from '@earendil-works/pi-coding-agent'

export type { AgentMessage, SessionEntry, SessionTreeNode }

// Locally-defined types

/**
 * SessionContext — the read-side context returned by buildSessionContext
 * + extended with pagination metadata per pi-web wire shape.
 *
 * Field-by-field (per ref_projects/pi-web/lib/types.ts:397-410):
 *   - messages: AgentMessage[]           — the resolved message list for LLM context
 *   - entryIds: string[]                  — parallel array; entry id per message
 *   - oldestEntryId: string | null        — for pagination cursor (Phase 3+)
 *   - hasMore: boolean                    — true if older pages exist
 *   - thinkingLevel: string               — 'off' | 'low' | 'medium' | 'high'
 *   - model: {provider, modelId} | null   — currently-active model (null when no model)
 *
 * Differs from SDK SessionContext: SDK has only 3 fields
 * (messages, thinkingLevel, model). The 3 extras are evo-pi/pi-web
 * extensions for the HTTP wire contract.
 */
export interface SessionContext {
  messages: AgentMessage[]
  entryIds: string[]
  oldestEntryId: string | null
  hasMore: boolean
  thinkingLevel: string
  model: { provider: string; modelId: string } | null
}

/**
 * SessionSearchResult — one match in /api/sessions/search response.
 *
 * Mirrors pi-web ref_projects/pi-web/lib/session-search.ts:11-18:
 *   { session, entryId?, blockIndex, before, match, after }
 *
 * `entryId` is optional: matches at session-level fields (name /
 * firstMessage / allMessagesText) don't set it. Matches inside entry
 * messages set it to the entry's id.
 */
export interface SessionSearchResult {
  /** Matched session metadata (path, id, cwd, ...) */
  session: import('@earendil-works/pi-coding-agent').SessionInfo
  /** Entry id where the match was found; undefined for session-level matches */
  entryId?: string
  /** TextContent[] block index inside the matched entry */
  blockIndex: number
  /** Up to 80 chars before the match (whitespace-collapsed, ellipsis-prefixed) */
  before: string
  /** The matched text (whitespace-collapsed) */
  match: string
  /** Up to 80 chars after the match (whitespace-collapsed, ellipsis-suffixed) */
  after: string
}

/**
 * SessionSearchResponse — full /api/sessions/search response.
 *
 * Mirrors pi-web ref_projects/pi-web/lib/session-search.ts:20-23:
 *   { results: SessionSearchResult[], truncated: boolean }
 *
 * `truncated` is true when:
 *   - 500-file cap reached (MAX_FILES in pi-web)
 *   - 30-result cap reached (MAX_RESULTS)
 *   - 3-second time budget exceeded (TIME_BUDGET_MS)
 *   - File scan encountered a >1MB line (MAX_LINE_CHARS)
 *
 * UI surfaces this via "Refine search" hint per spec §13.
 */
export interface SessionSearchResponse {
  results: SessionSearchResult[]
  truncated: boolean
}
