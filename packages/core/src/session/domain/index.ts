/**
 * session/domain 公共导出。
 *
 * 当前 Phase 0 仅 3 个 barrel（session-info / session-entry / agent-message）。
 * 后续 phase 按需追加：session-info scanner (Phase 1)、use-cases (Phase 1) 等。
 *
 * 跨 capability 共享类型 SessionId / Path / Cwd / Timestamp 在 _shared/domain
 * 单独导出（per capability-boundary-final §5.1）。
 */

export type {
  AgentMessage,
  NewSessionOptions,
  SessionContext,
  SessionHeader,
} from './agent-message'
export type { IndexEntry, IndexMap, SessionIndexerPort } from './ports/session-indexer'
export type { SessionRepositoryPort } from './ports/session-repository'
export type { SessionStoragePort } from './ports/session-storage'
export type {
  BranchSummaryEntry,
  CompactionEntry,
  ContextEditableContent,
  ContextEditEntry,
  CustomEntry,
  CustomMessageEntry,
  FileEntry,
  ModelChangeEntry,
  ProjectedSessionEntry,
  SessionEntry,
  SessionEntryBase,
  SessionInfoEntry,
  SessionMessageEntry,
  SessionProjection,
  ThinkingLevelChangeEntry,
} from './session-entry'
export type {
  BranchPreview,
  SessionInfo,
  SessionTreeNode,
  SubagentSessionStatus,
} from './session-info'
