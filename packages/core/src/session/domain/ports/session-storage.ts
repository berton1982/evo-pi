import type { SessionEntry, SessionInfo } from '@earendil-works/pi-coding-agent'

import type { Cwd } from '../../../_shared/domain/cwd'
import type { Path } from '../../../_shared/domain/path'
import type { SessionId } from '../../../_shared/domain/session-id'

/**
 * SessionStoragePort — 直接文件 / SDK IO 抽象。
 *
 * PR.C 2C.2 adds 3 methods for read-side use-cases (per plan §7.5):
 *   - readEntries(filePath) — defensive copy of all entries in a session
 *   - getSessionFileForId(sessionId) — id → filePath reverse lookup
 *   - streamForSearch(filePath, signal) — line-by-line stream for search
 *
 * All Phase 1 methods preserved for backward compat (Task 1C.4 + 1D.3).
 *
 * Phase 1 (per task 1C.4):
 * - getSessionDir: SDK SessionManager.create(cwd).getSessionDir() (D12: 不重写 path encoding)
 * - readSessionInfo: SDK SessionManager.open(filePath) → mapToSessionInfo
 * - enumerateSessionFiles: scan session dir for *.jsonl files
 *
 * Phase 2 PR.C 2C.2 (read-side):
 * - readEntries: SDK SessionManager.open(filePath).getEntries() — defensive copy
 * - getSessionFileForId: walk agentDir/sessions/ recursively; for each *.jsonl, check id
 * - streamForSearch: fs.createReadStream + readline.createInterface
 *
 * Why split storage vs repository (per ADR 0003):
 * - repository = 业务语义 (listSessions, searchSessions, readSessionContext, ...)
 * - storage = 纯 IO (getDir, readFile, readEntries, streamForSearch, enumerate)
 * - 后续可换 storage 实现 (in-memory / remote) 不影响 repository
 *
 * SDK ≥80% reuse (per D7): all methods delegate to @earendil-works/pi-coding-agent
 * SessionManager.open() / .getEntries() / .getTree() — no JSONL parsing rewritten.
 */
export interface SessionStoragePort {
  /**
   * cwd → 该 cwd 下的 session 目录绝对路径。
   * 实现：SessionManager.create(cwd).getSessionDir() (D12 — SDK 直接调，不重写)
   *
   * 路径编码（per ref_projects/pi/packages/coding-agent/src/core/session-manager.ts:589-594）：
   *   `${agentDir}/sessions/--${cwd.replace(/^[/\\]/, "").replace(/[/\\:]/g, "-")}--`
   */
  getSessionDir(cwd: Cwd): string

  /**
   * 读单个 JSONL file → SessionInfo。
   * 实现：SessionManager.open(filePath) → map header + entries → SessionInfo
   *
   * @returns null if file unreadable / corrupted / wrong format.
   */
  readSessionInfo(filePath: Path): Promise<SessionInfo | null>

  /**
   * 列出 agentDir 下所有 *.jsonl 文件（递归所有 cwd 子目录）。
   * 实现：filesystem walk + filter `.jsonl` extension
   */
  enumerateSessionFiles(): Promise<Path[]>

  // -----------------------------------------------------------------
  // Phase 2 PR.C 2C.2: read-side methods
  // -----------------------------------------------------------------

  /**
   * 读单个 JSONL file → SessionEntry[]（defensive copy）。
   * 实现：SessionManager.open(filePath).getEntries()
   *
   * Used by readSessionContext / readSessionEntries / readSessionTree
   * use-cases (PR.C 2C.6) — they all need the entry list.
   *
   * SDK's getEntries() returns a defensive copy (per session-manager.d.ts);
   * we don't need to deep-clone again. O(N) but N is bounded (typical
   * session has hundreds of entries, perf acceptable per spec §13).
   *
   * @returns [] on parse error (corrupt JSONL); caller distinguishes via
   *   getSessionFileForId → 404 path for missing session.
   */
  readEntries(filePath: Path): Promise<SessionEntry[]>

  /**
   * sessionId → filePath 反向查找 (per plan §7.5).
   * 实现：walk agentDir/sessions/ recursively; for each *.jsonl,
   *   read header (first line) and check id === sessionId.
   *
   * Returns null if no match found (caller maps to SessionNotFoundError → 404).
   *
   * Why not cache: id→path is stable per session (header.id is set on
   * creation and never changes). Could cache in ScanIndexStore; Phase 3+
   * optimization. PR.C reads on every click — worst case is one extra
   * header parse per click, acceptable for Phase 2.
   */
  getSessionFileForId(sessionId: SessionId): Promise<string | null>

  /**
   * Line-by-line stream for search scanning.
   * 实现：fs.createReadStream(filePath, { encoding: 'utf8', signal }) +
   *   readline.createInterface({ input: stream, crlfDelay: Infinity })
   *
   * Used by searchSessions use-case (PR.C 2C.5) — pi-web pattern is to
   * scan JSONL line-by-line and regex-match entry content.
   *
   * @param signal optional AbortSignal (e.g. 3s TIME_BUDGET_MS from caller)
   * @returns AsyncIterable<string> — one line per iteration, UTF-8 decoded
   */
  streamForSearch(filePath: Path, signal?: AbortSignal): AsyncIterable<string>
}
