import { createReadStream, existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { createInterface } from 'node:readline'

import type { SessionEntry, SessionInfo } from '@earendil-works/pi-coding-agent'
import { SessionManager } from '@earendil-works/pi-coding-agent'
import type { Cwd } from '../../_shared/domain/cwd'
import type { Path } from '../../_shared/domain/path'
import type { SessionId } from '../../_shared/domain/session-id'
import type { SessionStoragePort } from '../domain/ports/session-storage'

/**
 * FileSystemSessionStorage — 直接调 SDK 的 SessionManager 读 JSONL。
 *
 * per plan §7.5 + D12:
 * - getSessionDir: SessionManager.create(cwd).getSessionDir() (不重写 path encoding)
 * - readSessionInfo: SessionManager.open(filePath) + getters → compose SessionInfo
 * - enumerateSessionFiles: walk agentDir recursively for *.jsonl
 *
 * SDK 不暴露 buildSessionInfo（per `ref_projects/pi/packages/coding-agent/dist/`），
 * 所以这里手工组装 SessionInfo（getHeader + getEntries + compute firstMessage）。
 * Phase 2+ 可考虑 fork SDK 暴露 helper，或读取缓存的 scan-index 来避免重读盘。
 */

export class FileSystemSessionStorage implements SessionStoragePort {
  constructor(private readonly agentDir: string) {}

  /**
   * cwd → 该 cwd 下的 session 目录绝对路径。
   * 实现：SessionManager.create(cwd).getSessionDir() (D12)
   */
  getSessionDir(cwd: Cwd): string {
    return SessionManager.create(cwd).getSessionDir()
  }

  /**
   * 读 JSONL file → SessionInfo。
   * 实现：SessionManager.open + getters。
   *
   * SDK SessionManager.open throws on missing/corrupt file; we catch and return null.
   */
  async readSessionInfo(filePath: Path): Promise<SessionInfo | null> {
    let manager: SessionManager
    try {
      manager = SessionManager.open(filePath)
    } catch {
      return null
    }

    const header = manager.getHeader()
    if (!header) return null

    const entries = manager.getEntries()
    let firstMessage = ''
    let name: string | undefined
    let lastActivityTime: number | undefined

    for (const entry of entries) {
      // Extract session name (use latest; explicit clears handled by name='' skipped)
      if (entry.type === 'session_info') {
        name = entry.name?.trim() || undefined
        continue
      }
      if (entry.type !== 'message') continue

      // Extract firstMessage (first user message with text content)
      const message = entry.message
      if (firstMessage === '') {
        if (message.role === 'user' && Array.isArray(message.content)) {
          const text = message.content
            .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
            .map((c) => c.text)
            .join(' ')
          if (text) firstMessage = text
        }
      }

      // Track latest activity time
      const entryTs = new Date(entry.timestamp).getTime()
      if (!Number.isNaN(entryTs)) {
        lastActivityTime = Math.max(lastActivityTime ?? 0, entryTs)
      }
    }

    if (!firstMessage) firstMessage = '(no messages)'

    // Derive modified (latest activity > header time > file mtime)
    const headerTime = new Date(header.timestamp).getTime()
    const modified = lastActivityTime
      ? new Date(lastActivityTime)
      : !Number.isNaN(headerTime)
        ? new Date(headerTime)
        : new Date(statSync(filePath).mtimeMs)

    return {
      path: filePath,
      id: header.id,
      cwd: typeof header.cwd === 'string' ? header.cwd : '',
      name,
      parentSessionPath: header.parentSession,
      created: new Date(header.timestamp),
      modified,
      messageCount: manager.getEntryCount(),
      firstMessage,
      allMessagesText: '', // Phase 1 doesn't expose this; compute on demand in adapter
    }
  }

  /**
   * 列出 agentDir 下所有 *.jsonl 文件（递归所有 cwd 子目录）。
   *
   * Phase 1 简化：广度优先 walk `${agentDir}/sessions/` 下子目录。
   * Phase 2+ 可改用 SDK 内部 listAllSessions 或更高效的 iterator。
   */
  async enumerateSessionFiles(): Promise<Path[]> {
    const root = join(this.agentDir, 'sessions')
    if (!existsSync(root)) return []
    return walkJsonl(root)
  }

  // PR.C 2C.4: real read-side implementations.
  //
  // All 3 methods use the SDK's SessionManager.open() + JSONL parsing.
  // We deliberately don't write our own JSONL parser — per D7 (≥80% SDK reuse)
  // and the JSONL schema v3 contract (per study #4 §5.1).

  /**
   * readEntries — defensive copy of all SessionEntry[] in a session file.
   * 实现：SessionManager.open(filePath).getEntries()
   *
   * SDK's getEntries() returns a fresh array (defensive copy per
   * session-manager.d.ts); we don't need to deep-clone again. Per
   * plan §13, O(N) is acceptable for Phase 2 (typical session has
   * hundreds of entries; perf budget verified in Task 2C.11).
   *
   * @returns [] on missing file or parse error (caller distinguishes
   *   from SessionNotFoundError via getSessionFileForId).
   */
  async readEntries(filePath: Path): Promise<SessionEntry[]> {
    try {
      const manager = SessionManager.open(filePath as string)
      return manager.getEntries()
    } catch {
      return []
    }
  }

  /**
   * getSessionFileForId — walk agentDir/sessions/ and find the *.jsonl
   * whose header.id matches sessionId.
   *
   * Implementation:
   * 1. enumerateSessionFiles() → list of all *.jsonl paths
   * 2. For each path, read the first line (header) and check `id === sessionId`
   * 3. Return first match or null
   *
   * Why not cache: id→path is stable (header.id set on creation, never
   * changes). Could cache in ScanIndexStore; Phase 3+ optimization.
   * PR.C reads on every click — worst case is one extra header parse
   * per click, acceptable for Phase 2.
   *
   * Why read only the first line: SessionHeader is always the first JSONL
   * entry. readFileSync on a tiny file is faster than parsing the whole thing.
   */
  async getSessionFileForId(sessionId: SessionId): Promise<string | null> {
    const targetId = sessionId as string
    const paths = await this.enumerateSessionFiles()
    for (const pathStr of paths) {
      try {
        const firstLine = readFileSync(pathStr as string, { encoding: 'utf8' }).split('\n', 1)[0]
        if (!firstLine) continue
        const header = JSON.parse(firstLine) as { type?: string; id?: string }
        if (header.type === 'session' && header.id === targetId) {
          return pathStr as string
        }
      } catch {}
    }
    return null
  }

  /**
   * streamForSearch — line-by-line AsyncIterable for search scanning.
   *
   * Implementation: fs.createReadStream + readline.createInterface with
   * crlfDelay: Infinity (handles CR, LF, CRLF consistently).
   *
   * The AbortSignal cancels the underlying stream; pi-web wraps searchSessions
   * with a 3s TIME_BUDGET_MS timeout and threads the signal through.
   *
   * @param signal optional AbortSignal (e.g. 3s timeout from caller)
   */
  async *streamForSearch(filePath: Path, signal?: AbortSignal): AsyncIterable<string> {
    if (!existsSync(filePath as string)) {
      return // yields nothing
    }
    const stream = createReadStream(filePath as string, {
      encoding: 'utf8',
      signal,
    })
    const lines = createInterface({ input: stream, crlfDelay: Infinity })
    try {
      for await (const line of lines) {
        yield line
      }
    } finally {
      lines.close()
      stream.destroy()
    }
  }
}

/** Recursively find *.jsonl files under `dir` */
function walkJsonl(dir: string): Path[] {
  const out: Path[] = []
  if (!existsSync(dir)) return out

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      out.push(...walkJsonl(fullPath))
    } else if (entry.isFile() && entry.name.endsWith('.jsonl')) {
      out.push(fullPath as Path)
    }
  }
  return out
}
