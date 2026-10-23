/**
 * Performance test: read-side use-cases on large sessions (per spec §13).
 *
 *   - readSessionContext(<id>) < 500ms for 1000-entry session
 *   - searchSessions(<term>) < 3000ms (TIME_BUDGET_MS) for 100 sessions
 *
 * Why these budgets:
 * - spec §13 lists readSessionContext as Phase 2 minimum with O(N) defensive
 *   copy acceptable for "hundreds" of entries; we test 1000 for 10x headroom
 * - pi-web's searchSessionContents uses 3s TIME_BUDGET_MS; same here
 *
 * What this catches:
 * - O(N²) regressions in SDK getEntries / buildSessionContext
 * - search algorithm perf drift (extra JSON parses, missing line filters)
 *
 * @vitest-environment node
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { sessionId } from '../../_shared/domain/session-id'
import { FileSystemSessionStorage, JsonlSessionRepository, ScanIndexStore } from '../adapters/index'
import { makeReadSessionContext, makeSearchSessions } from './index'

const ENTRIES_PER_SESSION = 1000
const SEARCH_SESSIONS = 100
const CONTEXT_BUDGET_MS = 500
const SEARCH_BUDGET_MS = 3000

let tmpDir: string

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'read-perf-'))
  const cwd = '/perf/read'
  const safePath = `--${cwd.replace(/^[/\\]/, '').replace(/[/\\:]/g, '-')}--`
  const sessionDir = join(tmpDir, 'sessions', safePath)
  mkdirSync(sessionDir, { recursive: true })

  // Generate 1 large session (1000 entries) for readSessionContext test
  const largeId = 'perf-large'
  const largePath = join(sessionDir, `${largeId}.jsonl`)
  const lines: string[] = [
    JSON.stringify({
      type: 'session',
      version: 3,
      id: largeId,
      timestamp: '2026-10-11T00:00:00.000Z',
      cwd,
      provider: 'anthropic',
      modelId: 'claude-sonnet-4-5',
      thinkingLevel: 'off',
    }),
  ]
  for (let i = 0; i < ENTRIES_PER_SESSION; i++) {
    const role = i % 2 === 0 ? 'user' : 'assistant'
    lines.push(
      JSON.stringify({
        type: 'message',
        id: `e${i}`,
        parentId: i === 0 ? null : `e${i - 1}`,
        timestamp: new Date(2026, 9, 11, 0, 0, i).toISOString(),
        message:
          role === 'assistant'
            ? {
                role,
                content: [{ type: 'text', text: `response ${i}` }],
                api: 'anthropic-messages',
                provider: 'anthropic',
                model: 'claude-sonnet-4-5',
                usage: {
                  input: 10,
                  output: 20,
                  cacheRead: 0,
                  cacheWrite: 0,
                  totalTokens: 30,
                  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
                },
                stopReason: 'end_turn',
                timestamp: 1733715200000 + i,
              }
            : {
                role,
                content: [{ type: 'text', text: `query ${i}` }],
                timestamp: 1733715200000 + i,
              },
      }),
    )
  }
  writeFileSync(largePath, lines.join('\n'), 'utf8')

  // Generate 100 small sessions for searchSessions test
  for (let s = 0; s < SEARCH_SESSIONS; s++) {
    const id = `search-${s.toString().padStart(3, '0')}`
    const filePath = join(sessionDir, `${id}.jsonl`)
    // Half contain "searchable" text, half don't (to exercise match/miss paths)
    const hasTerm = s % 2 === 0
    const lines: string[] = [
      JSON.stringify({
        type: 'session',
        version: 3,
        id,
        timestamp: '2026-10-11T00:00:00.000Z',
        cwd,
        provider: 'anthropic',
        modelId: 'claude-sonnet-4-5',
        thinkingLevel: 'off',
      }),
      JSON.stringify({
        type: 'message',
        id: 'e1',
        parentId: null,
        timestamp: '2026-10-11T00:00:01.000Z',
        message: {
          role: 'user',
          content: [
            {
              type: 'text',
              text: hasTerm ? 'this is searchable content' : 'no match here',
            },
          ],
          timestamp: 1733715201000,
        },
      }),
    ]
    writeFileSync(filePath, lines.join('\n'), 'utf8')
  }
})

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true })
})

describe('read-side performance (PR.C 2C.11)', () => {
  it(`readSessionContext on ${ENTRIES_PER_SESSION}-entry session < ${CONTEXT_BUDGET_MS}ms`, async () => {
    const storage = new FileSystemSessionStorage(tmpDir)
    const indexer = new ScanIndexStore(tmpDir)
    const repo = new JsonlSessionRepository(storage, indexer)
    const readSessionContext = makeReadSessionContext({ repo })

    const start = performance.now()
    const ctx = await readSessionContext(sessionId('perf-large'), { tail: 1000 })
    const elapsed = performance.now() - start

    expect(ctx.messages.length).toBeGreaterThan(0)
    expect(elapsed).toBeLessThan(CONTEXT_BUDGET_MS)
  })

  it(`searchSessions("searchable") on ${SEARCH_SESSIONS} sessions < ${SEARCH_BUDGET_MS}ms`, async () => {
    const storage = new FileSystemSessionStorage(tmpDir)
    const indexer = new ScanIndexStore(tmpDir)
    const repo = new JsonlSessionRepository(storage, indexer)
    const searchSessions = makeSearchSessions({ repo })

    const start = performance.now()
    const result = await searchSessions('searchable')
    const elapsed = performance.now() - start

    expect(result.results.length).toBeGreaterThan(0)
    expect(elapsed).toBeLessThan(SEARCH_BUDGET_MS)
  })

  it('searchSessions respects MAX_RESULTS=30 cap (truncated=true beyond cap)', async () => {
    const storage = new FileSystemSessionStorage(tmpDir)
    const indexer = new ScanIndexStore(tmpDir)
    const repo = new JsonlSessionRepository(storage, indexer)
    const searchSessions = makeSearchSessions({ repo })

    const result = await searchSessions('searchable')
    // 50 of 100 sessions contain "searchable" — exceeds 30 cap
    expect(result.results.length).toBeLessThanOrEqual(30)
    if (result.results.length === 30) {
      expect(result.truncated).toBe(true)
    }
  })
})
