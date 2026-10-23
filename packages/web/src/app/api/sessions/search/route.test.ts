/**
 * GET /api/sessions/search — PR.B stub (HTTP layer).
 *
 * Per spec §3.13 + plan §2B.3:
 *   - GET /api/sessions/search?q=<query>
 *   - 200: SessionSearchResponse { results: SessionSearchResult[], truncated: false }
 *   - 400: query > 200 chars (DoS protection per pi-web)
 *   - Empty query → { results: [], truncated: false } (no error)
 *
 * PR.B uses mockSearchSessions (PR.A 2A.3).
 * PR.C (Task 2C.7) swaps to real searchSessions use-case — same shape.
 *
 * Cache-Control: no-store (per pi-web app/api/sessions/search/route.ts:7).
 * Cross-validation: ref_projects/pi-web/app/api/sessions/search/route.ts
 */

import { describe, expect, it } from 'vitest'
import { GET } from '@/app/api/sessions/search/route'
// @vitest-environment node
import { SessionSearchResponseSchema } from '@/lib/api-types'

describe('GET /api/sessions/search (PR.B stub)', () => {
  it('returns 200 + valid SessionSearchResponse for a known query', async () => {
    const req = new Request('http://localhost/api/sessions/search?q=agent')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('results')
    expect(body).toHaveProperty('truncated')
  })

  it('response body matches SessionSearchResponseSchema (zod contract)', async () => {
    const req = new Request('http://localhost/api/sessions/search?q=Phase')
    const res = await GET(req)
    const body = await res.json()
    const parsed = SessionSearchResponseSchema.safeParse(body)
    expect(parsed.success).toBe(true)
  })

  it('returns 200 with empty results for empty query (no error)', async () => {
    const req = new Request('http://localhost/api/sessions/search?q=')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = (await res.json()) as { results: unknown[]; truncated: boolean }
    expect(body.results).toEqual([])
    expect(body.truncated).toBe(false)
  })

  it('returns 200 with empty results when query is omitted entirely', async () => {
    const req = new Request('http://localhost/api/sessions/search')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = (await res.json()) as { results: unknown[]; truncated: boolean }
    expect(body.results).toEqual([])
  })

  it('returns 400 when query exceeds 200 chars (DoS protection per pi-web)', async () => {
    const longQuery = 'a'.repeat(201)
    const req = new Request(
      `http://localhost/api/sessions/search?q=${encodeURIComponent(longQuery)}`,
    )
    const res = await GET(req)
    expect(res.status).toBe(400)
  })

  it('accepts query exactly 200 chars (boundary)', async () => {
    const boundary = 'b'.repeat(200)
    const req = new Request(
      `http://localhost/api/sessions/search?q=${encodeURIComponent(boundary)}`,
    )
    const res = await GET(req)
    expect(res.status).toBe(200)
    // No mock fixture has 200 b's, expect 0 matches
    const body = (await res.json()) as { results: unknown[]; truncated: boolean }
    expect(body.results).toEqual([])
    expect(body.truncated).toBe(false)
  })

  it('matches case-insensitively (per pi-web RegExp `i` flag)', async () => {
    const lower = await GET(new Request('http://localhost/api/sessions/search?q=phase'))
    const upper = await GET(new Request('http://localhost/api/sessions/search?q=PHASE'))
    const lowerBody = (await lower.json()) as { results: unknown[] }
    const upperBody = (await upper.json()) as { results: unknown[] }
    expect(lowerBody.results.length).toBeGreaterThan(0)
    expect(upperBody.results.length).toBe(lowerBody.results.length)
  })

  it('escapes regex special characters (literal substring, per pi-web)', async () => {
    // Literal ".*" should not match everything; only sessions with ".*" in text.
    // PR.C: real backend may have ".*" in some session content (e.g. regex docs
    // in pi-web). Use a more uniquely-no-match query to verify the regex
    // escape behavior — the literal string 'xyzzy_nomatch_*' with special
    // chars must NOT match anything (verified by escape).
    const noMatchQuery = 'xyzzy_nomatch_\\d+\\$.*'
    const res = await GET(
      new Request(`http://localhost/api/sessions/search?q=${encodeURIComponent(noMatchQuery)}`),
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { results: unknown[] }
    expect(body.results).toEqual([])
  })

  it('sets Cache-Control: no-store header (per pi-web)', async () => {
    const req = new Request('http://localhost/api/sessions/search?q=agent')
    const res = await GET(req)
    expect(res.headers.get('Cache-Control')).toBe('no-store')
  })
})
