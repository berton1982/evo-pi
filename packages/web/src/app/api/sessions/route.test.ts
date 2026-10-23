import { describe, expect, it } from 'vitest'
// @vitest-environment node
// PR.C: route imports @evo-pi/core (uses SDK + node:fs). The SDK
// SessionManager.open() requires Node environment, not jsdom.
import { GET } from '@/app/api/sessions/route'
import { ListSessionsResponseSchema } from '@/lib/api-types'

describe('GET /api/sessions (PR.B stub)', () => {
  it('returns 200 with valid JSON body', async () => {
    const req = new Request('http://localhost/api/sessions')
    const res = await GET(req)
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toContain('application/json')
    const body = (await res.json()) as unknown
    expect(body).toBeDefined()
  })

  it('response body matches ListSessionsResponseSchema', async () => {
    const req = new Request('http://localhost/api/sessions')
    const res = await GET(req)
    const body = (await res.json()) as unknown
    const parsed = ListSessionsResponseSchema.safeParse(body)
    expect(parsed.success).toBe(true)
  })

  it('returns the sessions list (real scan of agentDir; empty array OK)', async () => {
    const req = new Request('http://localhost/api/sessions')
    const res = await GET(req)
    const body = (await res.json()) as { sessions: unknown[] }
    // PR.C: real scan against PI_CODING_AGENT_DIR (or default). Length
    // depends on env; assert shape (array, has entries or is empty).
    expect(Array.isArray(body.sessions)).toBe(true)
    // Each session (if any) must have the SDK SessionInfo shape
    for (const session of body.sessions) {
      expect(typeof (session as { id: unknown }).id).toBe('string')
      expect(typeof (session as { path: unknown }).path).toBe('string')
    }
  })

  it('sets Cache-Control: no-store header (sessions change frequently)', async () => {
    const req = new Request('http://localhost/api/sessions')
    const res = await GET(req)
    expect(res.headers.get('Cache-Control')).toBe('no-store')
  })

  it('each session has the wire-format shape (string dates, no Date objects)', async () => {
    const req = new Request('http://localhost/api/sessions')
    const res = await GET(req)
    const body = (await res.json()) as { sessions: Array<{ created: unknown; modified: unknown }> }
    for (const session of body.sessions) {
      expect(typeof session.created).toBe('string')
      expect(typeof session.modified).toBe('string')
    }
  })

  it('includes all 4 top-level fields per pi-web contract', async () => {
    const req = new Request('http://localhost/api/sessions')
    const res = await GET(req)
    const body = (await res.json()) as Record<string, unknown>
    expect(body).toHaveProperty('sessions')
    expect(body).toHaveProperty('sessionListVersion')
    expect(body).toHaveProperty('runningSessionIds')
    expect(body).toHaveProperty('completionNotificationSuppressedSessionIds')
  })
})
