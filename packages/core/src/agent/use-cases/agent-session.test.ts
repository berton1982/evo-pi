import { describe, expect, it } from 'vitest'
import type { AgentTransport, TransportEvent } from '../domain/ports/agent-transport'
import { initialSessionState } from '../domain/session-state'
import { admitPrompt } from './agent-session'
import { reduceAgentEvent } from './reduce-agent-event'

function fakeTransport(ok = true): AgentTransport & { sends: unknown[] } {
  const sends: unknown[] = []
  return {
    sends,
    async send(_command, payload) {
      sends.push(payload)
      return ok
        ? { ok: true, value: { requestId: 1 } }
        : { ok: false, error: { code: 'transport-failed' } }
    },
    subscribe(): () => void {
      return () => {}
    },
  }
}

/** T-03 */
describe('admitPrompt（T-03 串行准入）', () => {
  it('空闲时直接发送，并带上幂等键', async () => {
    const transport = fakeTransport()
    const res = await admitPrompt({
      state: initialSessionState(),
      transport,
      sessionId: 's1',
      text: ' 你好 ',
      clientRequestId: 'c1',
    })
    expect(res.kind).toBe('sent')
    expect(transport.sends).toHaveLength(1)
    expect(transport.sends[0]).toMatchObject({
      sessionId: 's1',
      text: '你好',
      clientRequestId: 'c1',
    })
  })

  it('运行中不打断：转成排队，且不调用传输', async () => {
    const transport = fakeTransport()
    const res = await admitPrompt({
      state: { ...initialSessionState(), phase: 'running' },
      transport,
      sessionId: 's1',
      text: '追加一句',
      mode: 'followUp',
    })
    expect(res.kind).toBe('queued')
    expect(res.mode).toBe('followUp')
    expect(transport.sends).toHaveLength(0)
  })

  it('空文本直接拒绝，不发请求', async () => {
    const transport = fakeTransport()
    const res = await admitPrompt({
      state: initialSessionState(),
      transport,
      sessionId: 's1',
      text: '   ',
    })
    expect(res.kind).toBe('sent')
    if (res.kind === 'sent') expect(res.outcome).toMatchObject({ ok: false })
    expect(transport.sends).toHaveLength(0)
  })
})

/** T-04 */
describe('reduceAgentEvent（T-04 事件归约）', () => {
  const ev = (requestId: number, type: string): TransportEvent => ({ requestId, type, payload: {} })

  it('start 事件进入 running，end 事件回到 idle 并标记 finished', () => {
    const a = reduceAgentEvent(initialSessionState(), ev(2, 'message_start'))
    expect(a.state.phase).toBe('running')
    expect(a.finished).toBe(false)
    const b = reduceAgentEvent(a.state, ev(3, 'message_end'))
    expect(b.state.phase).toBe('idle')
    expect(b.finished).toBe(true)
  })

  it('旧事件被丢弃并标记 stale，不改阶段', () => {
    const run = reduceAgentEvent(initialSessionState(), ev(5, 'message_start'))
    const stale = reduceAgentEvent(run.state, ev(4, 'message_end'))
    expect(stale.stale).toBe(true)
    expect(stale.state.phase).toBe('running')
  })

  it('压缩事件进入 compacting（此时按钮应显示"停止压缩"）', () => {
    const res = reduceAgentEvent(initialSessionState(), ev(1, 'auto_compaction_start'))
    expect(res.state.phase).toBe('compacting')
  })

  it('压缩结束后回到 idle（缺 compaction_end 会永远卡在 compacting）', () => {
    const compacting = reduceAgentEvent(initialSessionState(), ev(1, 'compaction_start')).state
    expect(compacting.phase).toBe('compacting')
    const done = reduceAgentEvent(compacting, ev(1, 'compaction_end'))
    expect(done.state.phase).toBe('idle')
    expect(done.finished).toBe(true)
  })
})
