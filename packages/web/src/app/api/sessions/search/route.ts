import {
  FileSystemSessionStorage,
  JsonlSessionRepository,
  makeSearchSessions,
  ScanIndexStore,
} from '@evo-pi/core/session'
import { createInMemorySystemAdapter, makeGetSystemConfig } from '@evo-pi/core/system'
import { NextResponse } from 'next/server'

import { SessionSearchResponseSchema } from '@/lib/api-types'

/**
 * GET /api/sessions/search — PR.C real backend.
 *
 * PR.B (Task 2B.3) used mockSearchSessions. PR.C swaps to the real
 * searchSessions use-case backed by JsonlSessionRepository's ponytail
 * scan (per pi-web lib/session-search.ts:24-68 algorithm).
 *
 * Cross-validation: ref_projects/pi-web/app/api/sessions/search/route.ts
 */

const adapter = createInMemorySystemAdapter()
const getSystemConfig = makeGetSystemConfig({ config: adapter })
const SYSTEM_CONFIG = getSystemConfig()
const storage = new FileSystemSessionStorage(SYSTEM_CONFIG.agentDir)
const indexer = new ScanIndexStore(SYSTEM_CONFIG.agentDir)
const repo = new JsonlSessionRepository(storage, indexer)
const searchSessions = makeSearchSessions({ repo })

const _MAX_QUERY_LENGTH = 200

export const dynamic = 'force-dynamic'

export async function GET(req: Request): Promise<Response> {
  const query = (new URL(req.url).searchParams.get('q') ?? '').trim()
  const headers = { 'Cache-Control': 'no-store' }

  if (query === '') {
    return NextResponse.json({ results: [], truncated: false }, { headers })
  }

  try {
    const response = await searchSessions(query)
    // Map SDK SessionInfo (Date) → wire SessionInfoDto (ISO string) per PR.B contract lock.
    // SessionSearchResult.session is SessionInfo, but wire schema (PR.B 2B.1) expects
    // SessionInfoDto with string dates. Without this map, zod parse throws 500.
    const wireResults = response.results.map((r) => ({
      ...r,
      session: {
        ...r.session,
        created: r.session.created.toISOString(),
        modified: r.session.modified.toISOString(),
      },
    }))
    const wire = { results: wireResults, truncated: response.truncated }
    const validated = SessionSearchResponseSchema.parse(wire)
    return NextResponse.json(validated, { headers })
  } catch (error) {
    if (error instanceof RangeError && error.message.includes('200')) {
      return NextResponse.json(
        { error: 'Search query exceeds 200 characters' },
        { status: 400, headers },
      )
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500, headers },
    )
  }
}
