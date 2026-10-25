/**
 * session 公共导出（per packages/core/package.json:exports ./session）。
 *
 * Phase 1 范围：
 * - domain: SessionInfo / SessionEntry / AgentMessage 等 SDK re-exports + ports
 * - use-cases: makeListSessions (factory pattern)
 * - adapters: FileSystemSessionStorage + ScanIndexStore + JsonlSessionRepository + in-memory fakes
 *
 * 后续 phase 按需追加：read-session-info / create-session / fork / 等 use-cases。
 */

// PR.C 2C.7: re-export sessionId brand constructor so web can construct
// branded SessionId from URL params at route boundaries.
export { sessionId } from '../_shared/domain/session-id'
// Re-export adapters so web can import from one place
export {
  FileSystemSessionStorage,
  InMemoryIndexer,
  InMemorySessionRepository,
  InMemorySessionStorage,
  JsonlSessionRepository,
  ScanIndexStore,
} from './adapters/index'
export type {
  AgentMessage,
  NewSessionOptions,
  SessionHeader,
} from './domain/agent-message'
export type {
  IndexEntry,
  IndexMap,
  SessionIndexerPort,
  SessionRepositoryPort,
  SessionStoragePort,
} from './domain/index'
export type { SessionEntry } from './domain/session-entry'
// PR.C 2C.1: SessionTreeNode now in types.ts barrel (kept re-export from
// session-info.ts for backward compat with Phase 1 consumers).
export type { SessionInfo, SessionTreeNode, SubagentSessionStatus } from './domain/session-info'
export {
  SessionNotFoundError,
  SessionReadError,
} from './domain/session-not-found-error'
// PR.C 2C.1: SessionContext re-exported from the new types.ts barrel
// (our local extension of SDK's narrower 3-field SessionContext).
// PR.C 2C.1: new search types
export type { SessionContext, SessionSearchResponse, SessionSearchResult } from './domain/types'
export { createNewSession, type NewSession } from './use-cases/create-session'
export {
  makeListSessions,
  makeReadSessionContext,
  makeReadSessionEntries,
  makeReadSessionInfo,
  makeReadSessionTree,
  makeSearchSessions,
} from './use-cases/index'
