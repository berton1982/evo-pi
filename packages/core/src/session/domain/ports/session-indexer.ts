import type { Path } from '../../../_shared/domain/path'

/**
 * IndexEntry — scan-index 单条 entry 的最小字段集。
 *
 * Mirror pi-web `lib/session-list-scanner.ts:15-42` ScannedSessionInfo（简化版）：
 * - filePath: JSONL 文件绝对路径
 * - mtimeMs: 文件 mtime（fingerprint 用 — per study #3 §3.3）
 * - size: 文件 size（fingerprint 用）
 * - id: session id（cache key）
 *
 * Phase 1 不存 created/modified/messageCount — 这些从 SDK 读盘时计算（成本高）。
 * Phase 2+ 可以扩展为 summary fields（fingerprint + summary metadata）。
 */
export interface IndexEntry {
  filePath: Path
  mtimeMs: number
  size: number
  id: string
}

/**
 * IndexMap — file path → IndexEntry 的映射（in-memory）。
 *
 * Phase 1 简化：plain Map，Phase 2+ 加 LRU + memory pressure eviction
 * （per D17 + capability-boundary-final §7.6）。
 */
export type IndexMap = Map<string, IndexEntry>

/**
 * SessionIndexerPort — scan-index 的内存 + 持久化抽象。
 *
 * 行为（per plan §1C.2）：
 * - getIndex: 取得当前 in-memory index
 * - invalidate(filePath?): 让 index 失效（下次 listSessions 重新扫描）
 * - persist: 写盘（debounced by caller）
 *
 * 实现（1C.3 ScanIndexCache + ScanIndexStorage + 1C.4 ScanIndexStore）：
 * - ScanIndexStore wraps ScanIndexCache (in-memory Map) + ScanIndexStorage (file IO)
 * - persist → write ~/.pi/agent/evo-pi-session-index.json (per D6)
 */
export interface SessionIndexerPort {
  /** 当前 in-memory index 引用（read-only 推荐；写通过 invalidate） */
  getIndex(): IndexMap

  /**
   * 让 entry 失效（filePath 为空时让整个 index 失效）。
   * listSessions 检测到 invalidated entry 时重读盘 + 更新 fingerprint。
   */
  invalidate(filePath?: Path): void

  /**
   * 持久化 index 到 disk。debounced by caller（避免每个 entry 变更都写盘）。
   * Caller 应在以下时机调：debounced timer、batch invalidation 后、空闲时段。
   */
  persist(): Promise<void>
}
