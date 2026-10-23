/**
 * _shared/domain 公共导出。
 *
 * Phase 0 仅 5 个文件：4 个 branded types + 1 个 DomainError 基类。
 * 后续 phase 按需追加（更多 branded types 如 Provider / ModelId / Branch 等，
 * 见 capability-boundary-final §5.1）。
 */

export type { Cwd } from './cwd'
export { cwd } from './cwd'
export { DomainError } from './domain-error'
export type { Path } from './path'
export { isPath, path } from './path'
export type { SessionId } from './session-id'
export { sessionId } from './session-id'
export type { Timestamp } from './timestamp'
export { timestamp } from './timestamp'
