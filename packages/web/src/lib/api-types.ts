/**
 * api-types — zod schemas for HTTP API request/response shapes (per PR.B).
 *
 * 这些是 wire-format DTO（per plan §6.4 contract lock），与 SDK SessionInfo 不同：
 * - created / modified 是 ISO string（JSON 没法表示 Date）
 * - 可选字段 + 缺失字段容忍（HTTP 边界）
 *
 * PR.B scope:
 *   - SessionInfoDto + ListSessionsResponse (Phase 1 PR.B)
 *   - AgentMessageSchema + SessionContextSchema + SessionSearchResponseSchema
 *     (Phase 2 PR.B 2B.1, this PR)
 *
 * Contract lock 决策（per plan §6.4 + spec §6.4）：
 * - PR.B 锁定 wire shape
 * - PR.C 必须返回相同 schema (route → use-case → DTO)
 *
 * 后续 PR.B+ 按需增 DTO (POST /api/sessions 等)。
 */

import { z } from 'zod'

/**
 * SessionInfoDto — 单条 session 的 wire shape。
 *
 * 字段映射（与 SDK SessionInfo 一一对应 + Date → ISO string）：
 * - path: string (required, file path)
 * - id: string (required, UUID)
 * - cwd: string (required, 允许空字符串 per SDK）
 * - parentSessionPath?: string (可选；fork 的源 session 路径)
 * - name?: string (可选；用户通过 /session-name 设置的展示名)
 * - created: string (required, ISO 8601)
 * - modified: string (required, ISO 8601)
 * - messageCount: number (required, non-negative integer)
 * - firstMessage: string (required, 可为 "" 或 "(no messages)")
 * - allMessagesText: string (required, 完整文本 — PR.A 不展示，Phase 2+ 用)
 */
export const SessionInfoDtoSchema = z.object({
  path: z.string().min(1),
  id: z.string().min(1),
  cwd: z.string(),
  parentSessionPath: z.string().optional(),
  name: z.string().optional(),
  created: z.string().min(1),
  modified: z.string().min(1),
  messageCount: z.number().int().nonnegative(),
  firstMessage: z.string(),
  allMessagesText: z.string(),
})

/**
 * ListSessionsResponse — GET /api/sessions 响应。
 *
 * 字段（per pi-web app/api/sessions/route.ts）：
 *   sessions: SessionInfo[] (required, 可空数组)
 *   sessionListVersion: number (optional — etag/optimistic concurrency)
 *   runningSessionIds: string[] (optional — 哪些 session 当前 agent 正在跑)
 *   completionNotificationSuppressedSessionIds: string[] (optional — 用户已静音)
 *
 * **Ruling**: plan §1B.2 未列 `completionNotificationSuppressedSessionIds`，但
 * pi-web 实际返回该字段。包含之（向后兼容 pi-web contract）。PR.C 真实 backend
 * 必须返回；PR.B stub 返回空数组即可。**Cost if wrong**: trivial addition if
 * pi-web 也废弃此字段。
 */
export const ListSessionsResponseSchema = z.object({
  sessions: z.array(SessionInfoDtoSchema),
  sessionListVersion: z.number().int().nonnegative().optional(),
  runningSessionIds: z.array(z.string()).optional(),
  completionNotificationSuppressedSessionIds: z.array(z.string()).optional(),
})

export type SessionInfoDto = z.infer<typeof SessionInfoDtoSchema>
export type ListSessionsResponse = z.infer<typeof ListSessionsResponseSchema>

/**
 * mapDtoToSessionInfo — wire DTO → SDK SessionInfo。
 *
 * - created / modified: ISO string → Date
 * - 其余字段直接 passthrough
 *
 * PR.B scope：定义但不强制使用（useSessionList 在 PR.B.4 才切到 fetch）。
 * PR.C 时由 core/adapters 处理（single source of truth）。
 */
export function mapDtoToSessionInfo(dto: SessionInfoDto): {
  path: string
  id: string
  cwd: string
  parentSessionPath?: string
  name?: string
  created: Date
  modified: Date
  messageCount: number
  firstMessage: string
  allMessagesText: string
} {
  return {
    ...dto,
    created: new Date(dto.created),
    modified: new Date(dto.modified),
  }
}

// ---------------------------------------------------------------------------
// Phase 2 PR.B 2B.1 — SessionContext + SearchResponse zod schemas
// ---------------------------------------------------------------------------

/**
 * TextContent — wire shape of a text content block.
 *
 * Per SDK UserMessage.content = string | (TextContent | ImageContent)[],
 * the string form is accepted by AgentMessageSchema via z.union below.
 */
const TextContentSchema = z.object({
  type: z.literal('text'),
  text: z.string(),
})

/**
 * UserMessage wire schema — per SDK UserMessage in @earendil-works/pi-ai.
 *
 * SDK type:
 *   { role: 'user'; content: string | (TextContent|ImageContent)[]; timestamp: number }
 *
 * Web mirrors `content` as `string | TextContent[]` (image content passthrough
 * via the fallback record for Phase 3+ typed rendering).
 */
const UserMessageSchema = z.object({
  role: z.literal('user'),
  content: z.union([z.string(), z.array(TextContentSchema)]),
  timestamp: z.number().optional(),
})

/**
 * Usage wire schema — per SDK Usage in @earendil-works/pi-ai.
 *
 * The cost subobject is always present (zero-cost calls still have a `cost`
 * block per the SDK).
 */
const UsageCostSchema = z.object({
  input: z.number(),
  output: z.number(),
  cacheRead: z.number(),
  cacheWrite: z.number(),
  total: z.number(),
})
const UsageSchema = z.object({
  input: z.number(),
  output: z.number(),
  cacheRead: z.number(),
  cacheWrite: z.number(),
  totalTokens: z.number(),
  cost: UsageCostSchema,
})

/**
 * AssistantMessage wire schema — per SDK AssistantMessage.
 */
const AssistantMessageSchema = z.object({
  role: z.literal('assistant'),
  content: z.array(TextContentSchema),
  api: z.string(),
  provider: z.string(),
  model: z.string(),
  usage: UsageSchema,
  stopReason: z.string(),
  timestamp: z.number().optional(),
})

/**
 * AgentMessageSchema — discriminated union of message variants.
 *
 * PR.B minimum: user + assistant (typed). toolResult / custom / bashExecution
 * / unknown future roles passthrough via `z.record(z.unknown())` per spec §3.12
 * ruling ("tolerant toolResult passthrough").
 *
 * Per D-P2-5: keep the unknown-role arm at the end of the union so it never
 * preempts the typed variants during safeParse().
 */
export const AgentMessageSchema = z.union([
  UserMessageSchema,
  AssistantMessageSchema,
  // Fallback for toolResult / custom / bashExecution / future roles.
  // Phase 3+ will add typed variants as the SDK's union widens.
  z.record(z.unknown()),
])

/**
 * SessionContextSchema — GET /api/sessions/[id]/context response shape.
 *
 * Per pi-web ref_projects/pi-web/lib/types.ts:397-410:
 *   { messages, entryIds, oldestEntryId, hasMore, thinkingLevel, model }
 *
 * - messages / entryIds are parallel arrays (consumer invariant; not enforced
 *   by the schema itself — runtime invariant enforced by the route handler).
 * - oldestEntryId is nullable per SDK SessionContext semantics.
 * - model is nullable (per spec §3.4 — null when no model is active).
 */
export const SessionContextSchema = z.object({
  messages: z.array(AgentMessageSchema),
  entryIds: z.array(z.string()),
  oldestEntryId: z.string().nullable(),
  hasMore: z.boolean(),
  thinkingLevel: z.string(),
  model: z
    .object({
      provider: z.string(),
      modelId: z.string(),
    })
    .nullable(),
})

/**
 * SessionSearchResultSchema — one match in /api/sessions/search response.
 *
 * Per pi-web ref_projects/pi-web/lib/session-search.ts:11-18:
 *   { session, entryId?, blockIndex, before, match, after }
 *
 * - `entryId` is optional (matches at session-level fields don't set it).
 * - `before` / `match` / `after` are formatted strings (whitespace-collapsed,
 *   ellipsis at 80-char window per pi-web algorithm).
 */
export const SessionSearchResultSchema = z.object({
  session: SessionInfoDtoSchema,
  entryId: z.string().optional(),
  blockIndex: z.number(),
  before: z.string(),
  match: z.string(),
  after: z.string(),
})

/**
 * SessionSearchResponseSchema — GET /api/sessions/search response shape.
 *
 * Per pi-web ref_projects/pi-web/lib/session-search.ts:20-23:
 *   { results: SessionSearchResult[], truncated: boolean }
 */
export const SessionSearchResponseSchema = z.object({
  results: z.array(SessionSearchResultSchema),
  truncated: z.boolean(),
})

// Derived types — Phase 2 PR.B wire types.
export type AgentMessage = z.infer<typeof AgentMessageSchema>
export type SessionContext = z.infer<typeof SessionContextSchema>
export type SessionSearchResult = z.infer<typeof SessionSearchResultSchema>
export type SessionSearchResponse = z.infer<typeof SessionSearchResponseSchema>
export type TextContentWire = z.infer<typeof TextContentSchema>
export type UserMessageWire = z.infer<typeof UserMessageSchema>
export type AssistantMessageWire = z.infer<typeof AssistantMessageSchema>
export type UsageWire = z.infer<typeof UsageSchema>
export type UsageCostWire = z.infer<typeof UsageCostSchema>
