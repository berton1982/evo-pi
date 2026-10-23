import {
  FileSystemSessionStorage,
  JsonlSessionRepository,
  makeReadSessionContext,
  ScanIndexStore,
  SessionNotFoundError,
  sessionId,
} from '@evo-pi/core/session'
import { createInMemorySystemAdapter, makeGetSystemConfig } from '@evo-pi/core/system'
import { NextResponse } from 'next/server'
import { SessionContextSchema } from '@/lib/api-types'

/**
 * GET /api/sessions/[id]/context — PR.C real backend.
 *
 * Wires the same module-level singletons as /api/sessions (PR.C):
 * - InMemorySystemAdapter for getSystemConfig
 * - FileSystemSessionStorage for filesystem reads
 * - ScanIndexStore for in-memory index cache
 * - JsonlSessionRepository orchestrating above
 *
 * PR.B (Task 2B.2) used getMockSessionContext (mock data). PR.C swaps to
 * the SDK-backed readSessionContext use-case. Same wire contract.
 *
 * Cross-validation: ref_projects/pi-web/app/api/sessions/[id]/context/route.ts
 * Per plan §2C.7: handler signature unchanged from PR.B.
 */

// 组合根**按请求**解析，不在模块顶层快照。
//
// 为什么：`createInMemorySystemAdapter().getConfig()` 里的 `PI_CODING_AGENT_DIR`
// 是**调用时**求值的。模块级 `const SYSTEM_CONFIG = getSystemConfig()` 会在 import
// 那一刻把 agentDir 钉死——测试里 `beforeAll` 设的 env 读不到（5 个用例 404），
// 多 agentDir 部署也会串目录。按 agentDir 记忆化既保持"一次请求只建一次"，
// 又不把配置写死在 import 时。
//
// 见 `arch/rules.json` 的 forbiddenEdges：route 顶层不许 `const x = createX()`。
type ReadSessionContext = ReturnType<typeof makeReadSessionContext>
let cached: { agentDir: string; read: ReadSessionContext } | null = null

function readSessionContextFor(): ReadSessionContext {
  const config = makeGetSystemConfig({ config: createInMemorySystemAdapter() })()
  if (cached?.agentDir === config.agentDir) return cached.read
  const storage = new FileSystemSessionStorage(config.agentDir)
  const indexer = new ScanIndexStore(config.agentDir)
  const repo = new JsonlSessionRepository(storage, indexer)
  cached = { agentDir: config.agentDir, read: makeReadSessionContext({ repo }) }
  return cached.read
}

// Per PR.D follow-up: default tail is "all" (delegated to repo's 10000
// default). Client can explicitly pass tail=N to cap. Hard cap 10000 matches
// repo's hard cap; >1000 returns 400 (per pi-web route contract).
const HARD_TAIL_CAP = 10000

export const dynamic = 'force-dynamic'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params
  const url = new URL(req.url)
  const leafId = url.searchParams.get('leafId') ?? undefined
  const before = url.searchParams.get('before') ?? undefined
  const rawTail = Number(url.searchParams.get('tail'))
  let tail: number | undefined
  if (Number.isFinite(rawTail) && rawTail > 0) {
    if (rawTail > HARD_TAIL_CAP) {
      return NextResponse.json(
        { error: `tail exceeds ${HARD_TAIL_CAP} characters` },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      )
    }
    tail = Math.min(rawTail, HARD_TAIL_CAP)
  }
  // If tail not provided, don't pass it — let the repo's default (10000)
  // take over so the full history is returned unless the client explicitly
  // paginates (per PR.D follow-up: default 50 → 10000; previously 50/1351
  // was returned, hiding 96% of history).

  try {
    const context = await readSessionContextFor()(sessionId(id), { leafId, before, tail })
    const validated = SessionContextSchema.parse(context)
    return NextResponse.json(
      { context: validated, tail: tail ?? validated.messages.length, before: before ?? null },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    if (error instanceof SessionNotFoundError) {
      return NextResponse.json(
        { error: 'session_not_found' },
        { status: 404, headers: { 'Cache-Control': 'no-store' } },
      )
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
