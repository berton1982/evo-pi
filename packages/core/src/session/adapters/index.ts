/**
 * session/adapters 公共导出。
 *
 * Phase 1（per plan §1C.4）：
 * - FileSystemSessionStorage: SDK-backed storage（PR.C 真实使用）
 * - ScanIndexStore: ScanIndexCache + ScanIndexStorage composite
 * - JsonlSessionRepository: orchestrates scan-index + storage
 * - InMemorySessionRepository + InMemorySessionStorage + InMemoryIndexer: test fakes
 */

export { FileSystemSessionStorage } from './filesystem-session-storage'
export {
  InMemoryIndexer,
  InMemorySessionRepository,
  InMemorySessionStorage,
} from './in-memory-session-repository'
export { JsonlSessionRepository } from './jsonl-session-repository'
export { ScanIndexStore } from './scan-index-store'
