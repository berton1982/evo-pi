import { describe, expect, it } from 'vitest'

import type { AgentTransport } from '../domain/ports/agent-transport'
import { createAbortTurn } from './abort-turn'
import { createCompactContext } from './compact-context'
import { createSendTurn } from './send-turn'

function fakeTransport(ok = true): AgentTransport & { calls: [string, unknown][] } {
  const calls: [string, unknown][] = []
  return {
    calls,
    async send(command, payload) {
      calls.push([command, payload])
      return ok
        ? { ok: true, value: { requestId: 7 } }
        : { ok: false, error: { code: 'x', message: 'boom' } }
    },
    subscribe() {
      return () => {}
    },
  }
}

describe('T-01 发送一轮（D-B-01 / B-009）', () => {
  it('空文本不发命令', async () => {
    const t = fakeTransport()
    const r = await createSendTurn({ transport: t }).send({
      sessionId: 's',
      text: '   ',
      isRunning: false,
    })
    expect(r).toEqual({ ok: false, error: { code: 'empty' } })
    expect(t.calls).toHaveLength(0)
  })

  it('空闲时发普通 prompt（不带 mode）', async () => {
    const t = fakeTransport()
    const r = await createSendTurn({ transport: t }).send({
      sessionId: 's',
      text: '你好',
      isRunning: false,
    })
    expect(r).toMatchObject({ ok: true, mode: 'followUp', requestId: 7 })
    expect(t.calls[0]?.[1]).toMatchObject({ sessionId: 's', text: '你好', mode: undefined })
  })

  it('运行中默认 steer，显式 followUp 时跟随', async () => {
    const t = fakeTransport()
    const uc = createSendTurn({ transport: t })
    expect(await uc.send({ sessionId: 's', text: 'a', isRunning: true })).toMatchObject({
      mode: 'steer',
    })
    expect(
      await uc.send({ sessionId: 's', text: 'b', isRunning: true, mode: 'followUp' }),
    ).toMatchObject({
      mode: 'followUp',
    })
  })

  it('同一幂等键 2s 内只发一次，过期后可重发', async () => {
    let clock = 1000
    const t = fakeTransport()
    const uc = createSendTurn({ transport: t, now: () => clock })
    expect(
      (await uc.send({ sessionId: 's', text: 'x', isRunning: false, clientRequestId: 'k' })).ok,
    ).toBe(true)
    expect(
      await uc.send({ sessionId: 's', text: 'x', isRunning: false, clientRequestId: 'k' }),
    ).toEqual({
      ok: false,
      error: { code: 'duplicate' },
    })
    clock += 3000
    expect(
      (await uc.send({ sessionId: 's', text: 'x', isRunning: false, clientRequestId: 'k' })).ok,
    ).toBe(true)
    expect(t.calls).toHaveLength(2)
  })

  it('传输失败原样上报', async () => {
    const t = fakeTransport(false)
    const r = await createSendTurn({ transport: t }).send({
      sessionId: 's',
      text: 'x',
      isRunning: false,
    })
    expect(r).toEqual({ ok: false, error: { code: 'transport', message: 'boom' } })
  })
})

describe('T-02 中断与压缩守卫（D-B-02 / D-B-03 / B-010）', () => {
  it('未运行时 abort 是空操作，不发命令', async () => {
    const t = fakeTransport()
    const r = await createAbortTurn({ transport: t }).abort('s', false)
    expect(r).toEqual({ ok: false, error: { code: 'not-running' } })
    expect(t.calls).toHaveLength(0)
  })

  it('运行中 abort 发一次命令', async () => {
    const t = fakeTransport()
    expect(await createAbortTurn({ transport: t }).abort('s', true)).toEqual({ ok: true })
    expect(t.calls[0]?.[0]).toBe('abort')
  })

  it('压缩进行中拒绝再次发起（按钮此时应显示"停止压缩"）', async () => {
    const t = fakeTransport()
    expect(await createCompactContext({ transport: t }).compact('s', true)).toEqual({
      ok: false,
      error: { code: 'already-running' },
    })
    expect(await createCompactContext({ transport: t }).compact('s', false)).toEqual({ ok: true })
  })

  it('传输失败上报 transport', async () => {
    const t = fakeTransport(false)
    expect(await createAbortTurn({ transport: t }).abort('s', true)).toEqual({
      ok: false,
      error: { code: 'transport', message: 'boom' },
    })
  })
})
