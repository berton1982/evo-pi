// 契约的机器版本 —— 与 contracts/data-format.md 一一对应。
// 为什么用 zod：evo-pi 现有 `packages/web/src/lib/api-types.ts` 已经是 zod，
// 迁移期间两边校验口径必须一致；纯类型无法在运行时保护"未知字段要保留"。
import { z } from 'zod'

export const ApiErrorSchema = z.object({
  code: z.enum([
    'session_not_found',
    'cwd_invalid',
    'model_unavailable',
    'provider_auth_required',
    'internal',
  ]),
  message: z.string(),
  errorId: z.string().optional(),
})
export type ApiError = z.infer<typeof ApiErrorSchema>

// 事件：只登记已知类型；未知类型必须被忽略（`.passthrough()` + 消费侧 default 分支）
export const WIRE_EVENT_TYPES = [
  'message_start',
  'message_update',
  'message_end',
  'text_delta',
  'thinking',
  'toolcall_start',
  'toolcall_delta',
  'toolcall_end',
  'tool_execution_start',
  'tool_execution_update',
  'tool_execution_end',
  'turn_start',
  'turn_end',
  'entry_appended',
  'agent_end',
  'custom',
] as const

export const WireEventSchema = z
  .object({ type: z.enum(WIRE_EVENT_TYPES), payload: z.record(z.string(), z.unknown()) })
  .passthrough()

// 会话文件的行：discriminatedUnion 的 key 是 `type`，未知 type 由 parseSessionLine 兜底
const ContentBlock = z
  .object({ type: z.string() })
  .passthrough()

export const SessionHeaderSchema = z
  .object({
    type: z.literal('session'),
    version: z.number().int().positive(),
    cwd: z.string(),
    id: z.string().regex(/^[A-Za-z0-9_-]+$/),
    timestamp: z.number(),
    parentSession: z.string().optional(),
  })
  .passthrough()

export const MessageLineSchema = z
  .object({
    type: z.literal('message'),
    role: z.enum(['user', 'assistant', 'system', 'tool']),
    content: z.union([z.string(), z.array(ContentBlock)]),
    timestamp: z.number(),
  })
  .passthrough()

export const KnownLineSchema = z.discriminatedUnion('type', [
  MessageLineSchema,
  z.object({ type: z.literal('custom'), customType: z.string(), data: z.unknown() }).passthrough(),
  z.object({ type: z.literal('custom_message'), customType: z.string(), content: z.unknown() }).passthrough(),
  z.object({ type: z.literal('model_change'), provider: z.string(), modelId: z.string() }).passthrough(),
  z.object({ type: z.literal('session_info'), name: z.string().optional() }).passthrough(),
  z.object({ type: z.literal('thinking_level_change'), thinkingLevel: z.string() }).passthrough(),
  z.object({ type: z.literal('compaction'), summary: z.string(), tokensBefore: z.number() }).passthrough(),
])

export type SessionLine = z.infer<typeof KnownLineSchema>

// 未知 type 必须"跳过但不丢"——返回值里的 raw 就是原文，
// 重写文件时原样写回（data-format.md 兼容硬约束 1/2）。
export function parseSessionLine(line: string):
  | { kind: 'header'; value: z.infer<typeof SessionHeaderSchema> }
  | { kind: 'known'; value: SessionLine }
  | { kind: 'unknown'; raw: string }
  | { kind: 'blank' } {
  const trimmed = line.replace(/^\uFEFF/, '').trim()
  if (!trimmed) return { kind: 'blank' }
  let json: unknown
  try {
    json = JSON.parse(trimmed)
  } catch {
    return { kind: 'unknown', raw: line }
  }
  const header = SessionHeaderSchema.safeParse(json)
  if (header.success) return { kind: 'header', value: header.data }
  const known = KnownLineSchema.safeParse(json)
  if (known.success) return { kind: 'known', value: known.data }
  return { kind: 'unknown', raw: line }
}
