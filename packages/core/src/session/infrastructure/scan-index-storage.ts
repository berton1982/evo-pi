import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

import type { IndexEntry } from '../domain/ports/session-indexer'

/**
 * Scan-index persisted file (per D6: independent from pi-web).
 *
 * File: `${agentDir}/evo-pi-session-index.json`
 * Schema: v1 — minimal shape; future versions can extend.
 *
 * pi-web uses `${agentDir}/pi-web-session-index.json` (per `lib/session-list-scanner.ts:287`).
 * evo-pi uses its own filename to avoid clobbering if both run on same agentDir.
 *
 * Schema v1:
 * ```json
 * {
 *   "version": 1,
 *   "entries": {
 *     "<absolutePath>": { "id": "...", "mtimeMs": 123, "size": 456 }
 *   }
 * }
 * ```
 *
 * Phase 1 stores minimal fingerprint only (no summary fields). PR.C.4
 * adapter reads JSONL header on cache miss to compute id/mtimeMs/size.
 *
 * Why v1 (not just "any"): when SDK changes shape, version bump tells loader
 * whether to cold-rebuild (old version) or warm-load (same version).
 */

export const SCAN_INDEX_FILE_NAME = 'evo-pi-session-index.json'
export const SCAN_INDEX_FORMAT_VERSION = 1 as const

export interface ScanIndexFile {
  version: number
  entries: Record<string, IndexEntry>
}

/**
 * Resolve the persisted index path for an agentDir.
 *
 * @example
 *   scanIndexFilePath('~/.pi/agent') → '~/.pi/agent/evo-pi-session-index.json'
 */
export function scanIndexFilePath(agentDir: string): string {
  return join(agentDir, SCAN_INDEX_FILE_NAME)
}

/**
 * Load persisted index from disk. Returns empty map if file missing /
 * corrupted (cold rebuild by caller).
 *
 * Schema validation: `version` must equal SCAN_INDEX_FORMAT_VERSION; entries
 * must be a plain object. Mismatched version triggers cold rebuild.
 *
 * Does NOT throw on parse failure (per pi-web pattern; corrupt index =>
 * silent cold rebuild, never error surface).
 */
export function loadPersistedIndex(agentDir: string): Map<string, IndexEntry> {
  const filePath = scanIndexFilePath(agentDir)
  if (!existsSync(filePath)) return new Map()

  let raw: string
  try {
    raw = readFileSync(filePath, 'utf8')
  } catch {
    return new Map()
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return new Map()
  }

  if (!isRecord(parsed)) return new Map()
  if (parsed.version !== SCAN_INDEX_FORMAT_VERSION) return new Map()
  if (!isRecord(parsed.entries)) return new Map()

  const map = new Map<string, IndexEntry>()
  for (const [pathKey, entryRaw] of Object.entries(parsed.entries)) {
    if (!isValidIndexEntry(entryRaw)) continue
    map.set(pathKey, entryRaw)
  }
  return map
}

/**
 * Persist the in-memory index to disk. Synchronous write (small file, OK).
 *
 * Caller should debounce (1C.4 ScanIndexStore handles debouncing).
 * Creates agentDir if missing.
 */
export function persistIndex(agentDir: string, entries: Map<string, IndexEntry>): void {
  const filePath = scanIndexFilePath(agentDir)
  const dir = dirname(filePath)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  const payload: ScanIndexFile = {
    version: SCAN_INDEX_FORMAT_VERSION,
    entries: Object.fromEntries(entries),
  }
  writeFileSync(filePath, JSON.stringify(payload), 'utf8')
}

// --- helpers ---

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isValidIndexEntry(value: unknown): value is IndexEntry {
  if (!isRecord(value)) return false
  return (
    typeof value.id === 'string' &&
    typeof value.filePath === 'string' &&
    typeof value.mtimeMs === 'number' &&
    Number.isFinite(value.mtimeMs) &&
    typeof value.size === 'number' &&
    Number.isSafeInteger(value.size) &&
    value.size >= 0
  )
}
