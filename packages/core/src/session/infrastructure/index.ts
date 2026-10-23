/**
 * session/infrastructure 公共导出。
 *
 * Phase 1（per plan §1C.3 + capability-boundary-final §4.2.3）：
 * - bounded-reader: 文件 chunked read（64KB header / 256KB relation / 64KB tail probe）
 * - scan-index-storage: 持久化到 disk（per D6: evo-pi-session-index.json）
 * - scan-index-cache: in-memory + LRU + memory pressure（per D17）
 * - sm-cache: SDK SessionManager LRU cache（per study #3 §3.3.1）
 *
 * Fixtures (`__fixtures__/sessions/*.jsonl`) 仅测试用；不导出。
 */

export {
  readBoundedLines,
  readBoundedTailLines,
  SESSION_HEADER_MAX_BYTES,
  SESSION_RELATION_MAX_BYTES,
  SESSION_TAIL_PROBE_MAX_BYTES,
} from './bounded-reader'
export {
  EVICTION_FRACTION,
  EVICTION_THRESHOLD,
  ScanIndexCache,
} from './scan-index-cache'
export {
  loadPersistedIndex,
  persistIndex,
  SCAN_INDEX_FILE_NAME,
  SCAN_INDEX_FORMAT_VERSION,
  scanIndexFilePath,
} from './scan-index-storage'
export { DEFAULT_SM_CACHE_SIZE, SmCache } from './sm-cache'
