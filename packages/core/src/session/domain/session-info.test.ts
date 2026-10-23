import type { SessionInfo, SessionTreeNode } from '@earendil-works/pi-coding-agent'
import { describe, expect, it } from 'vitest'
import type { BranchPreview, SubagentSessionStatus } from './session-info'

/**
 * Type-level smoke tests: ensure SDK re-exports are assignable to the
 * expected shapes and our local extensions compile.
 *
 * Runtime tests are minimal — these guards exist so that if anyone removes
 * a re-export or breaks the SDK boundary, the build fails before commit.
 */

describe('session/domain re-exports', () => {
  it('SessionInfo from SDK is structurally valid (compile-time)', () => {
    const sample: SessionInfo = {
      path: '/tmp/sess.jsonl',
      id: '2026-10-10T00-00-00-uuid',
      cwd: '/Users/test/proj',
      created: new Date(),
      modified: new Date(),
      messageCount: 0,
      firstMessage: '',
      allMessagesText: '',
    }
    expect(sample.id).toBe('2026-10-10T00-00-00-uuid')
  })

  it('SessionTreeNode from SDK is structurally valid (compile-time)', () => {
    // SessionTreeNode is a discriminated union; just ensure it is a type.
    // We don't construct a value here because the full shape depends on
    // SessionEntry variants we re-export.
    const _typeCheck: SessionTreeNode | undefined = undefined
    expect(_typeCheck).toBeUndefined()
  })

  it('BranchPreview (local extension) accepts optional role + text', () => {
    const preview: BranchPreview = { role: 'user', text: 'Hello' }
    expect(preview.text).toBe('Hello')

    const minimal: BranchPreview = { text: 'Just text' }
    expect(minimal.role).toBeUndefined()
  })

  it('SubagentSessionStatus covers SDK values + "interrupted"', () => {
    const all: SubagentSessionStatus[] = [
      'starting',
      'queued',
      'running',
      'completed',
      'failed',
      'aborted',
      'interrupted',
    ]
    expect(all).toHaveLength(7)
  })
})
