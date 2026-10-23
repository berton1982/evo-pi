import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { path } from '../../_shared/domain/path'

import {
  readBoundedLines,
  readBoundedTailLines,
  SESSION_HEADER_MAX_BYTES,
  SESSION_TAIL_PROBE_MAX_BYTES,
} from './bounded-reader'

let tmpDir: string
let filePath: string

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'bounded-reader-test-'))
  filePath = join(tmpDir, 'session.jsonl')
})

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true })
})

function writeLines(lines: string[]): void {
  writeFileSync(filePath, `${lines.join('\n')}\n`, 'utf8')
}

describe('readBoundedLines', () => {
  it('reads up to maxLines lines from start', () => {
    writeLines(['line1', 'line2', 'line3', 'line4', 'line5'])
    const result = readBoundedLines(path(filePath), 64 * 1024, 3)
    expect(result).toEqual(['line1', 'line2', 'line3'])
  })

  it('reads all lines if file has fewer than maxLines', () => {
    writeLines(['only', 'two'])
    const result = readBoundedLines(path(filePath), 64 * 1024, 100)
    expect(result).toEqual(['only', 'two'])
  })

  it('respects maxBytes limit', () => {
    // 10 lines × 200 bytes each ≈ 2KB
    const longLine = 'x'.repeat(195)
    writeLines(Array.from({ length: 10 }, (_, i) => `${longLine}${i}`))
    // maxBytes=500 → ~2 lines
    const result = readBoundedLines(path(filePath), 500, 100)
    expect(result.length).toBeLessThan(10)
    expect(result.length).toBeGreaterThan(0)
  })

  it('drops partial trailing line when byte-limited (still part of larger file)', () => {
    // Build file with long content; stop mid-line via maxBytes limit
    // so the last 'partial' line is dropped (we hit byte limit, not EOF)
    const lines: string[] = []
    for (let i = 0; i < 20; i++) lines.push(`line${i}-${'x'.repeat(50)}`)
    writeFileSync(filePath, `${lines.join('\n')}\n`, 'utf8')
    // maxBytes=300 → stops mid-line; partial is dropped
    const result = readBoundedLines(path(filePath), 300, 100)
    // Should have complete lines only
    for (const line of result) {
      expect(line).toMatch(/^line\d+-x+$/)
    }
  })

  it('strips trailing \\r from each line (Windows line endings)', () => {
    writeFileSync(filePath, 'line1\r\nline2\r\n', 'utf8')
    const result = readBoundedLines(path(filePath), 64 * 1024, 100)
    expect(result).toEqual(['line1', 'line2'])
  })

  it('returns empty array for empty file', () => {
    writeFileSync(filePath, '', 'utf8')
    const result = readBoundedLines(path(filePath), 64 * 1024, 100)
    expect(result).toEqual([])
  })

  it('header probe constant equals 64KB', () => {
    expect(SESSION_HEADER_MAX_BYTES).toBe(64 * 1024)
  })
})

describe('readBoundedTailLines', () => {
  it('reads last N bytes worth of lines', () => {
    writeLines(Array.from({ length: 100 }, (_, i) => `line${i}`))
    // Last 200 bytes → ~5-10 lines
    const result = readBoundedTailLines(path(filePath), 200)
    expect(result.length).toBeGreaterThan(0)
    expect(result.length).toBeLessThan(100)
  })

  it('drops first partial line when window does not start at line boundary', () => {
    // Force first line to not end at window start
    writeFileSync(filePath, 'first-long-line\nsecond\nthird\n', 'utf8')
    // Small window that doesn't include all of "first-long-line"
    const result = readBoundedTailLines(path(filePath), 20)
    expect(result.at(0)).not.toBe('first-long-line')
  })

  it('returns empty array for empty file', () => {
    writeFileSync(filePath, '', 'utf8')
    const result = readBoundedTailLines(path(filePath), 1024)
    expect(result).toEqual([])
  })

  it('tail probe constant equals 64KB', () => {
    expect(SESSION_TAIL_PROBE_MAX_BYTES).toBe(64 * 1024)
  })

  it('returns all lines if file smaller than maxBytes', () => {
    writeLines(['a', 'b', 'c'])
    const result = readBoundedTailLines(path(filePath), 64 * 1024)
    expect(result).toEqual(['a', 'b', 'c'])
  })
})
