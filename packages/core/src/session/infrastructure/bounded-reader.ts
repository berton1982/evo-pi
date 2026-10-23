import { closeSync, fstatSync, openSync, readSync } from 'node:fs'

import type { Path } from '../../_shared/domain/path'

/**
 * Bounded file reader — read first N bytes / N lines or last N bytes of a file.
 *
 * Used by SessionIndexerAdapter (1C.4) to probe JSONL session files without
 * loading the entire file. Per study #3 §3.3:
 * - SESSION_HEADER_MAX_BYTES = 64KB (header + first message)
 * - SESSION_RELATION_MAX_BYTES = 256KB (subagent / fork relations)
 * - SESSION_TAIL_PROBE_MAX_BYTES = 64KB (newest entry id / leaf)
 *
 * Pattern mirror pi-web `lib/session-reader.ts:22-91` (same algorithm).
 *
 * Phase 1 use cases:
 * - readBoundedLines (header probe — first N lines)
 * - readBoundedTailLines (leaf probe — last N bytes)
 *
 * 返回 string[]（lines split by \n；trailing \r stripped；EOF \n lines dropped）。
 */

/** Max bytes for header probe (per study #3 §3.3 SESSION_HEADER_MAX_BYTES) */
export const SESSION_HEADER_MAX_BYTES = 64 * 1024

/** Max bytes for relation probe (subagent / fork) */
export const SESSION_RELATION_MAX_BYTES = 256 * 1024

/** Max bytes for tail probe (latest entry id / leaf) */
export const SESSION_TAIL_PROBE_MAX_BYTES = 64 * 1024

/**
 * Read up to `maxBytes` and up to `maxLines` lines from the start of `filePath`.
 *
 * Stops at whichever limit is hit first. Strips trailing \r from each line.
 * If the file does not end with \n, the trailing partial line is dropped
 * (it's likely a torn write mid-append).
 *
 * @returns array of complete lines (excluding the partial trailing one)
 */
export function readBoundedLines(filePath: Path, maxBytes: number, maxLines: number): string[] {
  const fd = openSync(filePath, 'r')
  try {
    const chunks: Buffer[] = []
    let position = 0
    let newlineCount = 0
    let reachedEof = false

    while (position < maxBytes && newlineCount < maxLines) {
      const buffer = Buffer.allocUnsafe(Math.min(4096, maxBytes - position))
      const bytesRead = readSync(fd, buffer, 0, buffer.length, position)
      if (bytesRead === 0) {
        reachedEof = true
        break
      }
      position += bytesRead
      const data = buffer.subarray(0, bytesRead)
      let end = data.length
      for (let index = 0; index < data.length; index += 1) {
        if (data[index] !== 0x0a) continue
        newlineCount += 1
        if (newlineCount === maxLines) {
          end = index + 1
          break
        }
      }
      chunks.push(data.subarray(0, end))
    }

    const source = Buffer.concat(chunks).toString('utf8')
    const lines = source.split('\n')
    if (!reachedEof && !source.endsWith('\n')) lines.pop()
    if (lines.at(-1) === '') lines.pop()
    return lines.map((line) => (line.endsWith('\r') ? line.slice(0, -1) : line))
  } finally {
    closeSync(fd)
  }
}

/**
 * Read up to `maxBytes` from the END of `filePath`.
 *
 * Used for leaf-id probe — what was the last entry id / leaf written?
 * Avoids loading whole file when only the tail matters.
 *
 * Returns split lines. If the file has more content before our window,
 * the first returned line is partial and dropped (boundary check via 1-byte read).
 */
export function readBoundedTailLines(filePath: Path, maxBytes: number): string[] {
  const fd = openSync(filePath, 'r')
  try {
    const fileSize = fstatSync(fd).size
    const start = Math.max(0, fileSize - maxBytes)
    const buffer = Buffer.allocUnsafe(fileSize - start)
    const bytesRead = readSync(fd, buffer, 0, buffer.length, start)
    if (bytesRead === 0) return []

    const lines = buffer.subarray(0, bytesRead).toString('utf8').split('\n')
    if (start > 0) {
      const previousByte = Buffer.allocUnsafe(1)
      readSync(fd, previousByte, 0, 1, start - 1)
      if (previousByte[0] !== 0x0a) lines.shift()
    }
    if (lines.at(-1) === '') lines.pop()
    return lines.map((line) => (line.endsWith('\r') ? line.slice(0, -1) : line))
  } finally {
    closeSync(fd)
  }
}
