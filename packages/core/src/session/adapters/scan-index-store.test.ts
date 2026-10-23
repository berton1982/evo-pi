import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { path } from '../../_shared/domain/path'

import { ScanIndexStore } from './scan-index-store'

/**
 * ScanIndexStore focused test: verify persistence path writes the expected
 * JSON file (per D6: evo-pi-session-index.json in agentDir).
 *
 * This complements the acceptance check that requires `~/.pi/agent/evo-pi-session-index.json`
 * to exist when sessions exist (per plan §1C.8). Live env may have 0 sessions
 * (real cwd `/home/berton/evo-pi` has no JSONL files); the test exercises the
 * write path with a temp dir + fake entries.
 */

let tmpAgentDir: string

beforeEach(() => {
  tmpAgentDir = mkdtempSync(join(tmpdir(), 'scan-index-store-'))
})

afterEach(() => {
  rmSync(tmpAgentDir, { recursive: true, force: true })
})

describe('ScanIndexStore persistence', () => {
  it('writes index file at agentDir/evo-pi-session-index.json on explicit persist()', async () => {
    const store = new ScanIndexStore(tmpAgentDir)
    const idx = store.getIndex()
    idx.set('/a.jsonl', {
      id: 'a',
      filePath: path('/a.jsonl'),
      mtimeMs: 100,
      size: 50,
    })
    idx.set('/b.jsonl', {
      id: 'b',
      filePath: path('/b.jsonl'),
      mtimeMs: 200,
      size: 75,
    })

    await store.persist()

    const filePath = join(tmpAgentDir, 'evo-pi-session-index.json')
    expect(existsSync(filePath)).toBe(true)

    const raw = readFileSync(filePath, 'utf8')
    const parsed = JSON.parse(raw) as { version: number; entries: Record<string, unknown> }
    expect(parsed.version).toBe(1)
    expect(Object.keys(parsed.entries)).toHaveLength(2)
    expect(parsed.entries['/a.jsonl']).toMatchObject({ id: 'a', size: 50 })
    expect(parsed.entries['/b.jsonl']).toMatchObject({ id: 'b', size: 75 })
  })

  it('warm-loads persisted index on construction', () => {
    // Pre-populate the file
    const filePath = join(tmpAgentDir, 'evo-pi-session-index.json')
    const payload = {
      version: 1,
      entries: {
        '/x.jsonl': {
          id: 'x',
          filePath: '/x.jsonl',
          mtimeMs: 999,
          size: 10,
        },
      },
    }
    require('node:fs').writeFileSync(filePath, JSON.stringify(payload), 'utf8')

    const store = new ScanIndexStore(tmpAgentDir)
    const idx = store.getIndex()
    expect(idx.size).toBe(1)
    expect(idx.get('/x.jsonl')?.id).toBe('x')
    expect(idx.get('/x.jsonl')?.mtimeMs).toBe(999)
  })

  it('degrades gracefully when persisted file is corrupted (cold rebuild)', () => {
    const filePath = join(tmpAgentDir, 'evo-pi-session-index.json')
    require('node:fs').writeFileSync(filePath, '{not valid json', 'utf8')

    const store = new ScanIndexStore(tmpAgentDir)
    expect(store.getIndex().size).toBe(0)
  })

  it('degrades gracefully when persisted file has wrong version (cold rebuild)', () => {
    const filePath = join(tmpAgentDir, 'evo-pi-session-index.json')
    const payload = { version: 999, entries: {} }
    require('node:fs').writeFileSync(filePath, JSON.stringify(payload), 'utf8')

    const store = new ScanIndexStore(tmpAgentDir)
    expect(store.getIndex().size).toBe(0)
  })

  it('creates agentDir if it does not exist (persist path)', async () => {
    // Remove the tmp dir entirely
    rmSync(tmpAgentDir, { recursive: true, force: true })
    const store = new ScanIndexStore(tmpAgentDir)
    store.getIndex().set('/z.jsonl', {
      id: 'z',
      filePath: path('/z.jsonl'),
      mtimeMs: 0,
      size: 1,
    })

    await store.persist()
    expect(existsSync(tmpAgentDir)).toBe(true)
    expect(existsSync(join(tmpAgentDir, 'evo-pi-session-index.json'))).toBe(true)
  })
})
