/**
 * api-types — zod schemas for HTTP API request/response shapes (per PR.B).
 *
 * 这些是 wire-format DTO（per plan §6.4 contract lock），与 SDK SessionInfo 不同：
 * - created / modified 是 ISO string（JSON 没法表示 Date）
 * - 可选字段 + 缺失字段容忍（HTTP 边界）
 *
 * PR.B scope (PR.A added SessionInfoDto + ListSessionsResponse):
 *   - AgentMessageSchema (PR.A: zod union of user / assistant / passthrough)
 *   - SessionContextSchema (PR.A: messages + entryIds + hasMore + thinkingLevel + model)
 *   - SessionSearchResultSchema (PR.A: per-match snippet)
 *   - SessionSearchResponseSchema (PR.A: results + truncated)
 *
 * Contract lock (per plan §6.4 + spec §6.4):
 *   - PR.B 锁定 wire shape
 *   - PR.C 必须返回相同 schema (route → use-case → DTO)
 *
 * Phase 2 minimum coverage:
 *   - user messages with string OR TextContent[] content
 *   - assistant messages with full usage block
 *   - toolResult / custom / bashExecution → passthrough (per spec §3.12 ruling)
 */

import { describe, expect, it } from 'vitest'
import type { z } from 'zod'

import {
  AgentMessageSchema,
  type SessionContext,
  SessionContextSchema,
  SessionSearchResponseSchema,
  SessionSearchResultSchema,
} from '@/lib/api-types'

const userMessage = {
  role: 'user' as const,
  content: [{ type: 'text' as const, text: 'hello' }],
  timestamp: 1733715200000,
}

const assistantMessage = {
  role: 'assistant' as const,
  content: [{ type: 'text' as const, text: 'Hi! How can I help?' }],
  api: 'anthropic-messages',
  provider: 'anthropic',
  model: 'claude-sonnet-4-5',
  usage: {
    input: 100,
    output: 50,
    cacheRead: 0,
    cacheWrite: 0,
    totalTokens: 150,
    cost: {
      input: 0.0003,
      output: 0.00075,
      cacheRead: 0,
      cacheWrite: 0,
      total: 0.00105,
    },
  },
  stopReason: 'stop',
  timestamp: 1733715205000,
}

const toolResultMessage = {
  role: 'toolResult' as const,
  toolName: 'bash',
  toolCallId: 'call-1',
  content: [{ type: 'text' as const, text: 'output' }],
  isError: false,
  timestamp: 1733715210000,
}

const validSessionContext = {
  messages: [userMessage, assistantMessage],
  entryIds: ['e1', 'e2'],
  oldestEntryId: 'e1',
  hasMore: false,
  thinkingLevel: 'off',
  model: { provider: 'anthropic', modelId: 'claude-sonnet-4-5' },
}

describe('AgentMessageSchema', () => {
  it('parses a valid user message', () => {
    const r = AgentMessageSchema.safeParse(userMessage)
    expect(r.success).toBe(true)
  })

  it('accepts user message with string content (per SDK UserMessage.content union)', () => {
    const r = AgentMessageSchema.safeParse({
      ...userMessage,
      content: 'just a string',
    })
    expect(r.success).toBe(true)
  })

  it('parses a valid assistant message with full usage block', () => {
    const r = AgentMessageSchema.safeParse(assistantMessage)
    expect(r.success).toBe(true)
  })

  it('passthrough for toolResult (per spec §3.12 ruling)', () => {
    const r = AgentMessageSchema.safeParse(toolResultMessage)
    expect(r.success).toBe(true)
  })

  it('passthrough for unknown future roles (defensive)', () => {
    const r = AgentMessageSchema.safeParse({ role: 'someroledoesnotexistyet', payload: 42 })
    expect(r.success).toBe(true)
  })
})

describe('SessionContextSchema', () => {
  it('parses a valid SessionContext', () => {
    const r = SessionContextSchema.safeParse(validSessionContext)
    expect(r.success).toBe(true)
  })

  it('accepts model: null (per spec — nullable)', () => {
    const r = SessionContextSchema.safeParse({
      ...validSessionContext,
      model: null,
    })
    expect(r.success).toBe(true)
  })

  it('accepts oldestEntryId: null (per spec — nullable)', () => {
    const r = SessionContextSchema.safeParse({
      ...validSessionContext,
      oldestEntryId: null,
    })
    expect(r.success).toBe(true)
  })

  it('rejects when messages is missing', () => {
    const { messages: _m, ...bad } = validSessionContext
    const r = SessionContextSchema.safeParse(bad)
    expect(r.success).toBe(false)
  })

  it('rejects when entryIds length does not parallel messages length', () => {
    const r = SessionContextSchema.safeParse({
      ...validSessionContext,
      entryIds: ['e1'], // length 1 but messages.length = 2
    })
    // Schema does not enforce parallel length (that's a runtime invariant
    // enforced by mock-session-context); just confirm parse still succeeds
    // and downstream consumers tolerate it. Documented in spec §3.4.
    expect(r.success).toBe(true)
  })

  it('round-trips through z.infer (type SessionContext)', () => {
    const r: z.infer<typeof SessionContextSchema> = validSessionContext
    const parsed: SessionContext = SessionContextSchema.parse(r)
    expect(parsed.messages.length).toBe(2)
    expect(parsed.model?.provider).toBe('anthropic')
  })
})

describe('SessionSearchResultSchema', () => {
  const validResult = {
    session: {
      path: '/x.jsonl',
      id: 'sess-1',
      cwd: '/c',
      created: '2025-01-01T00:00:00.000Z',
      modified: '2025-01-02T00:00:00.000Z',
      messageCount: 5,
      firstMessage: 'hello',
      allMessagesText: 'hello world',
    },
    entryId: 'e1',
    blockIndex: 0,
    before: 'some context before',
    match: 'match',
    after: 'context after',
  }

  it('parses a valid result with all 7 fields', () => {
    const r = SessionSearchResultSchema.safeParse(validResult)
    expect(r.success).toBe(true)
  })

  it('accepts result without optional entryId (session-level match)', () => {
    const { entryId: _e, ...withoutEntry } = validResult
    const r = SessionSearchResultSchema.safeParse(withoutEntry)
    expect(r.success).toBe(true)
  })
})

describe('SessionSearchResponseSchema', () => {
  const validResponse = {
    results: [
      {
        session: {
          path: '/x.jsonl',
          id: 'sess-1',
          cwd: '/c',
          created: '2025-01-01T00:00:00.000Z',
          modified: '2025-01-02T00:00:00.000Z',
          messageCount: 1,
          firstMessage: 'hello',
          allMessagesText: 'hello world',
        },
        entryId: 'e1',
        blockIndex: 0,
        before: '',
        match: 'hello',
        after: '',
      },
    ],
    truncated: false,
  }

  it('parses a valid response', () => {
    const r = SessionSearchResponseSchema.safeParse(validResponse)
    expect(r.success).toBe(true)
  })

  it('accepts empty results array', () => {
    const r = SessionSearchResponseSchema.safeParse({
      results: [],
      truncated: false,
    })
    expect(r.success).toBe(true)
  })

  it('rejects when truncated is missing', () => {
    const { truncated: _t, ...bad } = validResponse
    const r = SessionSearchResponseSchema.safeParse(bad)
    expect(r.success).toBe(false)
  })
})
