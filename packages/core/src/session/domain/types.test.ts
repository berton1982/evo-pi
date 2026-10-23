/**
 * types — compile-time + structural contract test.
 *
 * PR.C 2C.1: Phase 2 read-side domain types. All types either:
 *   - Re-export from SDK (SessionContext, SessionTreeNode, SessionEntry)
 *   - Re-export from SDK lower-level deps (AgentMessage from pi-agent-core)
 *   - Defined locally (SessionSearchResult, SessionSearchResponse — not in SDK)
 *
 * Why these exist locally:
 *   - SDK @earendil-works/pi-coding-agent exports SessionContext, SessionTreeNode,
 *     SessionEntry — evo-pi re-exports for use-case consumers
 *   - SDK does NOT export SessionSearchResult / SessionSearchResponse — pi-web
 *     defines them in lib/session-search.ts; evo-pi copies the definition for
 *     its own use-case layer (read-side per plan §3.4)
 *   - AgentMessage comes from @earendil-works/pi-agent-core (lower-level SDK
 *     package); see agent-message.ts:9-12 for the import-path rationale
 *
 * Contract lock (per plan §6.4 + spec §3.4):
 *   These types are the source of truth for the read-side domain layer.
 *   Adapters (Task 2C.4 + 2C.5) consume them; use-cases (Task 2C.6) return
 *   them; web route handlers (Task 2C.7) pass them through to the wire DTO.
 */

import type { SessionInfo } from '@earendil-works/pi-coding-agent'
import { describe, expectTypeOf, it } from 'vitest'
import type {
  AgentMessage,
  SessionContext,
  SessionEntry,
  SessionSearchResponse,
  SessionSearchResult,
  SessionTreeNode,
} from './types'

describe('Phase 2 domain types (PR.C 2C.1)', () => {
  it('SessionContext is structurally compatible with pi-web wire shape', () => {
    // 6 fields per pi-web ref_projects/pi-web/lib/types.ts:397-410
    expectTypeOf<SessionContext>().toHaveProperty('messages')
    expectTypeOf<SessionContext>().toHaveProperty('entryIds')
    expectTypeOf<SessionContext>().toHaveProperty('oldestEntryId')
    expectTypeOf<SessionContext>().toHaveProperty('hasMore')
    expectTypeOf<SessionContext>().toHaveProperty('thinkingLevel')
    expectTypeOf<SessionContext>().toHaveProperty('model')
  })

  it('SessionTreeNode is re-exported from SDK (entry + children + label)', () => {
    expectTypeOf<SessionTreeNode>().toHaveProperty('entry')
    expectTypeOf<SessionTreeNode>().toHaveProperty('children')
  })

  it('SessionEntry union is re-exported from SDK', () => {
    // SessionEntry is a union of 11 variants per session-manager.d.ts:128
    // This compile-time check ensures the re-export is wired correctly.
    const entry: SessionEntry = {
      type: 'message',
      id: 'e1',
      parentId: null,
      timestamp: '2025-01-01T00:00:00Z',
      message: {
        role: 'user',
        content: [{ type: 'text', text: 'hi' }],
        timestamp: 0,
      },
    } as SessionEntry
    expectTypeOf(entry).toMatchTypeOf<SessionEntry>()
  })

  it('AgentMessage is the SDK discriminated union (pi-agent-core)', () => {
    // We use AgentMessage as the message type throughout read-side.
    // It supports user / assistant / toolResult / etc. — consumers
    // narrow on role.
    const msg: AgentMessage = {
      role: 'user',
      content: [{ type: 'text', text: 'hi' }],
      timestamp: 0,
    }
    expectTypeOf(msg.role).toEqualTypeOf<'user'>()
  })

  it('SessionSearchResult has the 6 expected fields (per pi-web lib/session-search.ts:11-18)', () => {
    expectTypeOf<SessionSearchResult>().toHaveProperty('session')
    expectTypeOf<SessionSearchResult>().toHaveProperty('entryId')
    expectTypeOf<SessionSearchResult>().toHaveProperty('blockIndex')
    expectTypeOf<SessionSearchResult>().toHaveProperty('before')
    expectTypeOf<SessionSearchResult>().toHaveProperty('match')
    expectTypeOf<SessionSearchResult>().toHaveProperty('after')
  })

  it('SessionSearchResult.session is SessionInfo (matches pi-web shape)', () => {
    expectTypeOf<SessionSearchResult['session']>().toEqualTypeOf<SessionInfo>()
  })

  it('SessionSearchResponse has 2 fields (results + truncated)', () => {
    expectTypeOf<SessionSearchResponse>().toHaveProperty('results')
    expectTypeOf<SessionSearchResponse>().toHaveProperty('truncated')
  })
})
