import { existsSync } from 'node:fs'
import {
  createNewSession,
  FileSystemSessionStorage,
  JsonlSessionRepository,
  makeListSessions,
  ScanIndexStore,
} from '@evo-pi/core/session'
import {
  createInMemorySystemAdapter,
  makeCheckProjectTrust,
  makeGetSystemConfig,
} from '@evo-pi/core/system'
import { NextResponse } from 'next/server'
import {
  type ListSessionsResponse,
  ListSessionsResponseSchema,
  type SessionInfoDto,
} from '@/lib/api-types'

/**
 * GET /api/sessions — PR.C real backend.
 *
 * Wires:
 * - InMemorySystemAdapter (Phase 1 minimum; gets defaultCwd + trust status)
 * - FileSystemSessionStorage (real filesystem via SDK SessionManager)
 * - ScanIndexStore (in-memory + persisted index)
 * - JsonlSessionRepository (orchestrates)
 * - makeListSessions + makeCheckProjectTrust + makeGetSystemConfig use-cases
 *
 * Flow:
 * 1. getSystemConfig().defaultCwd (where to list)
 * 2. checkProjectTrust(cwd) → 403 if untrusted
 * 3. listSessions(cwd) → SessionInfo[]
 * 4. Map to wire DTO (Date → ISO string)
 * 5. Validate via ListSessionsResponseSchema
 * 6. Return JSON with Cache-Control: no-store
 *
 * Why factory pattern: use-cases take ports as deps; we wire them once at
 * module init. Cleaner than per-request instantiation.
 *
 * Cross-validation: pi-web's GET /api/sessions returns same 4 fields;
 * trust check happens at `lib/project-trust.ts:39`. Our Phase 1 minimum
 * has trust=always-true (per Task 1C.1), so 403 path is structurally present
 * but never triggered until Phase 2 swaps InMemorySystemAdapter for SDK.
 */

// --- Module-level wiring (singleton per process) ---

const adapter = createInMemorySystemAdapter()
const getSystemConfig = makeGetSystemConfig({ config: adapter })
const checkProjectTrust = makeCheckProjectTrust({ trust: adapter })

// getAgentDir for filesystem scan (Phase 1: read from system config)
const SYSTEM_CONFIG = getSystemConfig()
const storage = new FileSystemSessionStorage(SYSTEM_CONFIG.agentDir)
const indexer = new ScanIndexStore(SYSTEM_CONFIG.agentDir)
const repo = new JsonlSessionRepository(storage, indexer)
const listSessions = makeListSessions({ repo })

/**
 * force-dynamic per pi-web convention (per session-reader.ts); sessions
 * change frequently and must never be cached at Next.js level.
 */
export const dynamic = 'force-dynamic'

export async function GET(_req: Request): Promise<Response> {
  const { defaultCwd } = getSystemConfig()

  // Trust check — Phase 1 returns trusted=true always; 403 path reserved for
  // Phase 2+ when SDK-backed adapter is wired.
  const trust = checkProjectTrust(defaultCwd)
  if (!trust.trusted) {
    return NextResponse.json(
      { error: 'project_not_trusted' },
      { status: 403, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  const sessions = await listSessions(defaultCwd)

  // Map SDK SessionInfo → wire DTO (Date → ISO string)
  const response: ListSessionsResponse = {
    sessions: sessions.map(
      (session): SessionInfoDto => ({
        path: session.path,
        id: session.id,
        cwd: session.cwd,
        parentSessionPath: session.parentSessionPath,
        name: session.name,
        created: session.created.toISOString(),
        modified: session.modified.toISOString(),
        messageCount: session.messageCount,
        firstMessage: session.firstMessage,
        allMessagesText: session.allMessagesText,
      }),
    ),
    sessionListVersion: 0,
    runningSessionIds: [],
    completionNotificationSuppressedSessionIds: [],
  }

  const validated = ListSessionsResponseSchema.parse(response)

  return NextResponse.json(validated, {
    headers: { 'Cache-Control': 'no-store' },
  })
}

/**
 * POST /api/sessions — 新建会话（只发号，不落盘）。
 *
 * 语义按 pi SDK：会话文件在第一条消息时才产生，所以这里不写 JSONL；
 * 返回的新 id 由前端放进 URL，第一次发消息时 agent 侧在同一 id 上落盘。
 * 只校验 cwd 是存在的绝对路径——写盘动作不在这一步，越权面最小。
 */
export async function POST(req: Request): Promise<Response> {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: { code: 'invalid-request', message: '请求体不是 JSON' } },
      { status: 400 },
    )
  }
  const cwd = (body as { cwd?: unknown } | null)?.cwd
  if (typeof cwd !== 'string' || !cwd.startsWith('/')) {
    return NextResponse.json(
      { error: { code: 'invalid-request', message: 'cwd 必须是绝对路径' } },
      { status: 400 },
    )
  }
  if (!existsSync(cwd)) {
    return NextResponse.json(
      { error: { code: 'not-found', message: 'cwd 不存在' } },
      { status: 404 },
    )
  }
  return NextResponse.json({ session: createNewSession(cwd) }, { status: 201 })
}
