/**
 * SessionId branded type.
 *
 * 跨 capability 共享的 session 标识（per capability-boundary-final §5.1）。
 * 在类型系统中区分 SessionId 与 Path / Cwd 等其他字符串。
 *
 * 当前 SDK 的 SessionId 是日期 + UUID 组合字符串
 * (ref_projects/pi-web/lib/types.ts:357 SessionInfo.id)；
 * 这里不做格式校验，只做 brand wrapping。
 */

export type SessionId = string & { readonly __brand: 'SessionId' }

/**
 * 将 string 提升为 SessionId branded type。
 * 空字符串会抛错——空 sessionId 会导致 JSONL 路径解析为错误路径。
 */
export function sessionId(value: string): SessionId {
  if (value.length === 0) {
    throw new Error('SessionId must be a non-empty string')
  }
  return value as SessionId
}
