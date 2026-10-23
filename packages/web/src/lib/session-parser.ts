/**
 * session-parser — raw JSON → typed SessionInfo。
 *
 * Phase 1 PR.A：web UI 读 mock-sessions.json 时用此 parser 做最小校验。
 * Phase 1 PR.C：会被 SDK SessionManager.open() 替换；本文件保留作为 fallback parser。
 *
 * 设计原则（per ADR 0004 runtime validation 简化版）：
 * - 纯 type guard，零运行时依赖（不引 zod——zod 在 PR.B 才加 per §6.4）
 * - 失败抛 typed error（per spec §9.1 DomainError pattern）
 * - 形状锚定 SDK SessionInfo re-export（11 字段 per
 *   ref_projects/pi/packages/coding-agent/src/core/session-manager.ts:222-243）
 *
 * 已知限制（PR.A mock 数据接受 ISO string 作为 created/modified）：
 * SDK 真实 SessionInfo.created 是 Date；pi-web 在 mapScannedSession 中
 * 显式 .toISOString() 转为 string（per session-reader.ts:240-241）。
 * 本 parser 不强转 Date —— PR.A mock 已是 string, 保持 string。
 * PR.C scanner 真实读盘路径走 SDK → SDK 返回 Date → mapToDto 转 string。
 */

import type { SessionInfo } from '@earendil-works/pi-coding-agent'

/**
 * SessionParseError — PR.A parser 校验失败抛出。
 *
 * PR.A scope：web-only fallback parser。不继承 core 的 DomainError（避免
 * cross-package 运行时依赖，web tsconfig exclude ../core/**）。
 *
 * PR.C 替换路径：core/session/use-cases/list-sessions 抛 JsonlParseError
 * （'jsonl_parse_error'）——本错误仅在 PR.A/B 期间生效，PR.D 后不再需要。
 *
 * 字段：
 * - `name` 让 `err.name === 'SessionParseError'`
 * - `field` 记录失败字段名（便于 UI 调试）
 * - `cause` 链底层 error（如有）
 */
export class SessionParseError extends Error {
  override readonly name = 'SessionParseError'
  constructor(
    message: string,
    public override readonly cause?: unknown,
  ) {
    super(message)
    // 保留正确的 prototype chain（TS extends Error 时必需）
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

/**
 * 校验单条 SessionInfo 的最小字段集合。
 *
 * SDK SessionInfo 11 字段 (per session-manager.ts:222-243)：
 * - path: string (required)
 * - id: string (required)
 * - cwd: string (required, can be "" for legacy)
 * - name?: string (optional)
 * - parentSessionPath?: string (optional)
 * - created: Date | string (mock: string; real: Date → ISO via scanner)
 * - modified: Date | string
 * - messageCount: number (non-negative integer)
 * - firstMessage: string (required, can be "(no messages)")
 * - allMessagesText: string (required)
 *
 * 此处只校验 required string 字段；optional 字段允许 undefined。
 */
const isString = (v: unknown): v is string => typeof v === 'string'
const isNonNegativeInteger = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0 && Number.isInteger(v)

export function parseSessionInfo(raw: unknown): SessionInfo {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new SessionParseError(
      `Expected SessionInfo object, received ${raw === null ? 'null' : Array.isArray(raw) ? 'array' : typeof raw}`,
    )
  }
  const obj = raw as Record<string, unknown>

  if (!isString(obj.path) || obj.path.length === 0) {
    throw new SessionParseError('SessionInfo.path must be a non-empty string')
  }
  if (!isString(obj.id) || obj.id.length === 0) {
    throw new SessionParseError('SessionInfo.id must be a non-empty string')
  }
  if (!isString(obj.cwd)) {
    throw new SessionParseError('SessionInfo.cwd must be a string')
  }
  if (!isString(obj.created) || obj.created.length === 0) {
    throw new SessionParseError('SessionInfo.created must be a non-empty string (ISO timestamp)')
  }
  if (!isString(obj.modified) || obj.modified.length === 0) {
    throw new SessionParseError('SessionInfo.modified must be a non-empty string (ISO timestamp)')
  }
  if (!isNonNegativeInteger(obj.messageCount)) {
    throw new SessionParseError('SessionInfo.messageCount must be a non-negative integer')
  }
  if (!isString(obj.firstMessage)) {
    throw new SessionParseError('SessionInfo.firstMessage must be a string')
  }
  if (!isString(obj.allMessagesText)) {
    throw new SessionParseError('SessionInfo.allMessagesText must be a string')
  }

  // name 可选；parentSessionPath 可选 — 只在 present 时校验 type
  if (obj.name !== undefined && !isString(obj.name)) {
    throw new SessionParseError('SessionInfo.name must be a string when present')
  }
  if (obj.parentSessionPath !== undefined && !isString(obj.parentSessionPath)) {
    throw new SessionParseError('SessionInfo.parentSessionPath must be a string when present')
  }

  // 转换 ISO string → Date（SDK SessionInfo.created / modified 是 Date）
  // JSON fixture 存 ISO string，parser 负责 promote。
  const created = new Date(obj.created)
  if (Number.isNaN(created.getTime())) {
    throw new SessionParseError(
      `SessionInfo.created must be a valid ISO timestamp, received ${obj.created}`,
    )
  }
  const modified = new Date(obj.modified)
  if (Number.isNaN(modified.getTime())) {
    throw new SessionParseError(
      `SessionInfo.modified must be a valid ISO timestamp, received ${obj.modified}`,
    )
  }

  return {
    ...obj,
    created,
    modified,
  } as SessionInfo
}

export function parseSessionInfoArray(raw: unknown): SessionInfo[] {
  if (!Array.isArray(raw)) {
    throw new SessionParseError(`Expected SessionInfo array, received ${typeof raw}`)
  }
  return raw.map((item, idx) => {
    try {
      return parseSessionInfo(item)
    } catch (e) {
      if (e instanceof SessionParseError) {
        throw new SessionParseError(`SessionInfo[${idx}]: ${e.message}`, e)
      }
      throw e
    }
  })
}
