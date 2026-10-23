/**
 * GET /api/sessions/[id]/context — PR.C real backend (HTTP layer).
 *
 * Per spec §3.13 + plan §2C.7:
 *   - 200 with SessionContext when sessionId is found in real agentDir
 *   - 404 when sessionId is unknown (caller maps SessionNotFoundError)
 *   - 400 when tail > 1000 (hard cap per pi-web route)
 *
 * PR.C uses real SDK SessionManager.buildSessionContext via the
 * readSessionContext use-case (Task 2C.6) wired in Task 2C.7.
 *
 * Tests use PI_CODING_AGENT_DIR override + a copied fixture (per
 * MEMORY §6.1 + Phase 1 hotfix D-C1) to ensure deterministic data.
 * Fixture: packages/core/src/session/infrastructure/__fixtures__/sessions/pi-web-real.jsonl
 *
 * @vitest-environment node
 */

import { cpSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { GET } from '@/app/api/sessions/[id]/context/route'
import { SessionContextSchema } from '@/lib/api-types'

const FIXTURE_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../../../../core/src/session/infrastructure/__fixtures__/sessions/pi-web-real.jsonl',
)

const FIXTURE_SESSION_ID = '01a12854-3ddd-75f1-af45-a4aa4b933c42'
const UNKNOWN_SESSION_ID = '00000000-0000-0000-0000-000000000000'

let tmpDir: string
let originalAgentDir: string | undefined

beforeAll(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'evo-pi-context-test-'))
  // Copy fixture to tmpDir/sessions/--fixture-cwd--/ (so SDK path encoding matches)
  const fixtureDir = join(tmpDir, 'sessions', '--fixture-cwd--')
  cpSync(FIXTURE_PATH, join(fixtureDir, 'pi-web-real.jsonl'), { recursive: true })
  // Override PI_CODING_AGENT_DIR BEFORE the route module is imported.
  // Since route.ts is already imported at the top of this file (vitest
  // hoists imports), this override takes effect for module-level
  // singletons only on first load. vitest re-evaluates per test file,
  // so this works.
  originalAgentDir = process.env.PI_CODING_AGENT_DIR
  process.env.PI_CODING_AGENT_DIR = tmpDir
})

afterAll(() => {
  rmSync(tmpDir, { recursive: true, force: true })
  if (originalAgentDir === undefined) delete process.env.PI_CODING_AGENT_DIR
  else process.env.PI_CODING_AGENT_DIR = originalAgentDir
})

describe('GET /api/sessions/[id]/context (PR.C real backend)', () => {
  it('returns 200 + valid SessionContext for the fixture sessionId', async () => {
    const req = new Request(`http://localhost/api/sessions/${FIXTURE_SESSION_ID}/context`)
    const res = await GET(req, { params: Promise.resolve({ id: FIXTURE_SESSION_ID }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('context')
    expect(body).toHaveProperty('tail')
    expect(body).toHaveProperty('before')
  })

  it('response body matches SessionContextSchema (zod contract)', async () => {
    const req = new Request(`http://localhost/api/sessions/${FIXTURE_SESSION_ID}/context`)
    const res = await GET(req, { params: Promise.resolve({ id: FIXTURE_SESSION_ID }) })
    const body = (await res.json()) as { context: unknown }
    const parsed = SessionContextSchema.safeParse(body.context)
    expect(parsed.success).toBe(true)
  })

  it('returns 404 for unknown sessionId', async () => {
    const req = new Request(`http://localhost/api/sessions/${UNKNOWN_SESSION_ID}/context`)
    const res = await GET(req, { params: Promise.resolve({ id: UNKNOWN_SESSION_ID }) })
    expect(res.status).toBe(404)
  })

  it('returns 400 when tail > 10000', async () => {
    const req = new Request(
      `http://localhost/api/sessions/${FIXTURE_SESSION_ID}/context?tail=10001`,
    )
    const res = await GET(req, { params: Promise.resolve({ id: FIXTURE_SESSION_ID }) })
    expect(res.status).toBe(400)
  })

  it('accepts valid tail=2 and caps to last 2 messages along active branch', async () => {
    // SDK buildSessionContext walks the active leaf path with tail cap.
    // Fixture has 26 message entries; tail=2 caps to last 2 along active branch
    // (which may be < 2 if the active branch has fewer entries than 2 from the
    // root, or exactly 2 if the branch reaches >=2 entries from the leaf).
    const req = new Request(`http://localhost/api/sessions/${FIXTURE_SESSION_ID}/context?tail=2`)
    const res = await GET(req, { params: Promise.resolve({ id: FIXTURE_SESSION_ID }) })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { context: { messages: unknown[]; entryIds: string[] } }
    expect(body.context.messages.length).toBeLessThanOrEqual(2)
    expect(body.context.entryIds.length).toBe(body.context.messages.length)
  })

  it('sets Cache-Control: no-store header', async () => {
    const req = new Request(`http://localhost/api/sessions/${FIXTURE_SESSION_ID}/context`)
    const res = await GET(req, { params: Promise.resolve({ id: FIXTURE_SESSION_ID }) })
    expect(res.headers.get('Cache-Control')).toBe('no-store')
  })

  it('response tail defaults to all (matches message count when ≤ 10000)', async () => {
    const req = new Request(`http://localhost/api/sessions/${FIXTURE_SESSION_ID}/context`)
    const res = await GET(req, { params: Promise.resolve({ id: FIXTURE_SESSION_ID }) })
    const body = (await res.json()) as { context: { messages: unknown[] }; tail: number }
    expect(body.context.messages.length).toBe(body.tail)
    expect(body.tail).toBeGreaterThan(0)
  })

  it('response before is null when not in query', async () => {
    const req = new Request(`http://localhost/api/sessions/${FIXTURE_SESSION_ID}/context`)
    const res = await GET(req, { params: Promise.resolve({ id: FIXTURE_SESSION_ID }) })
    const body = (await res.json()) as { before: string | null }
    expect(body.before).toBeNull()
  })
})
