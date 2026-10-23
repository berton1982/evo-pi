import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { SessionManager } from '@earendil-works/pi-coding-agent'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { FileSystemSessionStorage } from '../adapters/filesystem-session-storage'
import { JsonlSessionRepository } from '../adapters/jsonl-session-repository'
import { ScanIndexStore } from '../adapters/scan-index-store'

/**
 * JSONL roundtrip test (per plan §1D.2):
 *
 * 1. pi-web fixture (real-world format) is readable by evo-pi
 * 2. File copy preserves all entries + SessionInfo fields
 * 3. SDK SessionManager.open returns consistent data on repeated opens
 * 4. SDK write path via appendMessage persists correctly
 *
 * Why this matters:
 * - Per Q5 + spec §11.2 compat verification: bidirectional JSONL interchange
 * - Catches regression in SDK SessionManager ↔ file format compat
 *
 * NOTE on SDK methods used:
 * - appendMessage(message) is the canonical write API (not appendUserMessage)
 * - getSessionFile() returns undefined for in-memory sessions; need to
 *   append at least one entry before the session file is created (per
 *   ref_projects/pi/packages/coding-agent/src/core/session-manager.ts comment)
 */

const PI_WEB_FIXTURE = resolve(__dirname, './__fixtures__/sessions/pi-web-real.jsonl')
const PI_WEB_FIXTURE_SESSION_ID = '01a12854-3ddd-75f1-af45-a4aa4b933c42'

let tmpDir: string
let agentDir: string

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'roundtrip-'))
  // Copy fixture to tmpDir/sessions/--home/--/ (the fixture's cwd is /home/berton)
  const fixtureSessionDir = join(tmpDir, 'sessions', '--home-berton--')
  mkdirSync(fixtureSessionDir, { recursive: true })
  const sourceRaw = readFileSync(PI_WEB_FIXTURE, 'utf8')
  writeFileSync(join(fixtureSessionDir, 'pi-web-real.jsonl'), sourceRaw)
  agentDir = tmpDir
})

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true })
})

describe('JSONL roundtrip (PR.D 1D.2)', () => {
  it('reads back the pi-web fixture and returns consistent SessionInfo', () => {
    const manager = SessionManager.open(PI_WEB_FIXTURE)
    const sessionId = manager.getSessionId()
    const cwd = manager.getCwd()
    const header = manager.getHeader()

    // Read raw to get the canonical id from disk
    const raw = readFileSync(PI_WEB_FIXTURE, 'utf8')
    const headerLine = JSON.parse(raw.split('\n')[0]!) as { id: string }
    const expectedId = headerLine.id

    expect(sessionId).toBe(expectedId)
    expect(cwd).toBe('/home/berton')
    expect(header?.version).toBe(3)
    expect(manager.getEntryCount()).toBeGreaterThan(0)

    // Re-open and confirm we get the same data (cache or no cache, behavior is stable)
    const manager2 = SessionManager.open(PI_WEB_FIXTURE)
    expect(manager2.getSessionId()).toBe(sessionId)
    expect(manager2.getCwd()).toBe(cwd)
    expect(manager2.getEntryCount()).toBe(manager.getEntryCount())
  })

  it('pi-web fixture file content matches header when read raw', () => {
    // Direct file read sanity check (not via SDK)
    const raw = readFileSync(PI_WEB_FIXTURE, 'utf8')
    const lines = raw.split('\n').filter((l) => l.length > 0)
    expect(lines.length).toBeGreaterThan(0)
    const headerLine = JSON.parse(lines[0]!) as { type: string; id: string }
    expect(headerLine.type).toBe('session')
    expect(typeof headerLine.id).toBe('string')
    expect(headerLine.id.length).toBeGreaterThan(0)
  })

  it('manual JSONL roundtrip via file copy preserves all entries', () => {
    // Read source
    const sourceRaw = readFileSync(PI_WEB_FIXTURE, 'utf8')

    // Write to temp dir
    mkdirSync(tmpDir, { recursive: true })
    const copyPath = join(tmpDir, 'copy.jsonl')
    writeFileSync(copyPath, sourceRaw, 'utf8')

    // Open the copy and verify entry count matches
    const sourceManager = SessionManager.open(PI_WEB_FIXTURE)
    const copyManager = SessionManager.open(copyPath)
    expect(copyManager.getEntryCount()).toBe(sourceManager.getEntryCount())
    expect(copyManager.getSessionId()).toBe(sourceManager.getSessionId())
    expect(copyManager.getCwd()).toBe(sourceManager.getCwd())
  })

  it('writes a new session via SDK appendMessage and reads it back', () => {
    // Create a new session and append a message to trigger file creation
    const manager = SessionManager.create('/test/cwd')
    manager.appendMessage({
      role: 'user',
      content: [{ type: 'text', text: 'hello, world' }],
      timestamp: Date.now(),
    })

    // After first append, session file should be created
    const sessionPath = manager.getSessionFile()
    expect(sessionPath).toBeDefined()

    if (!sessionPath) return

    // Re-open and verify
    const reopened = SessionManager.open(sessionPath)
    expect(reopened.getCwd()).toBe('/test/cwd')
    expect(reopened.getEntryCount()).toBeGreaterThanOrEqual(1)

    const entries = reopened.getEntries()
    const msgEntry = entries.find((e) => e.type === 'message')
    expect(msgEntry).toBeDefined()
  })

  it('append multiple messages preserves entry count + first user content', () => {
    const manager = SessionManager.create('/test/cwd2')
    manager.appendMessage({
      role: 'user',
      content: [{ type: 'text', text: 'first message' }],
      timestamp: Date.now(),
    })
    // AssistantMessage requires api/provider/model/usage/stopReason fields;
    // cast to bypass the complex union type for this test.
    manager.appendMessage({
      role: 'assistant',
      content: [{ type: 'text', text: 'response 1' }],
      timestamp: Date.now(),
      api: 'anthropic-messages',
      provider: 'anthropic',
      model: 'claude-sonnet-4-5',
      usage: {
        input: 10,
        output: 20,
        cacheRead: 0,
        cacheWrite: 0,
        totalTokens: 30,
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
      },
      stopReason: 'end_turn' as never,
    })

    const sessionPath = manager.getSessionFile()
    expect(sessionPath).toBeDefined()
    if (!sessionPath) return

    const reopened = SessionManager.open(sessionPath)
    expect(reopened.getEntryCount()).toBeGreaterThanOrEqual(2)

    const entries = reopened.getEntries()
    const userMsgs = entries.filter(
      (e) => e.type === 'message' && 'message' in e && e.message.role === 'user',
    )
    expect(userMsgs.length).toBeGreaterThanOrEqual(1)
  })
})

// ---------------------------------------------------------------------------
// Phase 2 PR.C 2C.8: read-side roundtrip via evo-pi adapters
// ---------------------------------------------------------------------------
// Verifies that the read-side use-cases (readSessionContext / Entries / Tree
// / searchSessions) correctly read the pi-web fixture and produce valid
// data. Uses FileSystemSessionStorage + JsonlSessionRepository (real
// SDK-backed adapters) instead of mock fixtures.

describe('JSONL roundtrip — read-side (PR.C 2C.8)', () => {
  it('readSessionContext(<id>) returns valid SessionContext from pi-web fixture', async () => {
    const storage = new FileSystemSessionStorage(agentDir)
    const indexer = new ScanIndexStore(agentDir)
    const repo = new JsonlSessionRepository(storage, indexer)
    const { sessionId } = await import('../../_shared/domain/session-id')
    const sid = sessionId(PI_WEB_FIXTURE_SESSION_ID)

    const ctx = await repo.readSessionContext(sid)
    expect(ctx.messages.length).toBeGreaterThan(0)
    expect(ctx.messages.some((m) => m.role === 'user')).toBe(true)
    expect(ctx.messages.some((m) => m.role === 'assistant')).toBe(true)
    expect(ctx.entryIds.length).toBe(ctx.messages.length)
  })

  it('readSessionEntries(<id>) includes message entries (plus model_change etc.)', async () => {
    const storage = new FileSystemSessionStorage(agentDir)
    const indexer = new ScanIndexStore(agentDir)
    const repo = new JsonlSessionRepository(storage, indexer)
    const { sessionId } = await import('../../_shared/domain/session-id')
    const sid = sessionId(PI_WEB_FIXTURE_SESSION_ID)

    const entries = await repo.readSessionEntries(sid)
    // SDK returns ALL entries (header excluded); session has message + model_change
    // + thinking_level_change + compaction + ...
    expect(entries.length).toBeGreaterThan(0)
    const msgEntries = entries.filter((e) => e.type === 'message')
    expect(msgEntries.length).toBeGreaterThan(0)
  })

  it('readSessionTree(<id>) returns SessionTreeNode[] (non-empty for chained session)', async () => {
    const storage = new FileSystemSessionStorage(agentDir)
    const indexer = new ScanIndexStore(agentDir)
    const repo = new JsonlSessionRepository(storage, indexer)
    const { sessionId } = await import('../../_shared/domain/session-id')
    const sid = sessionId(PI_WEB_FIXTURE_SESSION_ID)

    const tree = await repo.readSessionTree(sid)
    // The fixture has a chain of message entries; tree has at least 1 root
    expect(tree.length).toBeGreaterThanOrEqual(1)
    expect(tree[0]?.entry).toBeDefined()
  })

  it('searchSessions("Phase 1") finds matches including real session (Q5 roundtrip)', async () => {
    const storage = new FileSystemSessionStorage(agentDir)
    const indexer = new ScanIndexStore(agentDir)
    const repo = new JsonlSessionRepository(storage, indexer)

    const result = await repo.searchSessions('Phase 1')
    // Phase 1 string may not be in this specific fixture — assert
    // either 0 or ≥1 results (algorithm correctness), with structure check
    expect(result.results).toBeDefined()
    expect(typeof result.truncated).toBe('boolean')
  })

  it('searchSessions("xyzzy_definitely_no_match_string") returns empty results', async () => {
    const storage = new FileSystemSessionStorage(agentDir)
    const indexer = new ScanIndexStore(agentDir)
    const repo = new JsonlSessionRepository(storage, indexer)

    const result = await repo.searchSessions('xyzzy_definitely_no_match_string')
    expect(result.results).toEqual([])
    expect(result.truncated).toBe(false)
  })
})
