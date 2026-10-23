import { describe, expect, it } from 'vitest'
import { type McpServerRef, ok } from '../domain/mcp-types'
import type { McpSignInFlowPort } from '../domain/ports'
import { createSignInFlow, mergeRound } from './sign-in-flow'

const ref: McpServerRef = { scope: 'user', name: 'gh' }

const port = (states: Array<'pending' | 'authorized' | 'failed'>): McpSignInFlowPort => {
  let i = 0
  return {
    begin: async () => ok({ flowId: 'f1', url: 'https://example.test' }),
    status: async () =>
      ok({
        state: states[Math.min(i++, states.length - 1)] as 'pending' | 'authorized' | 'failed',
      }),
    submit: async () => ok(undefined),
    cancel: async () => ok(undefined),
  }
}

describe('D-B-05 sign-in-flow', () => {
  it('T-10 发起后拿到 flowId，轮询推进 round', async () => {
    const flow = createSignInFlow({ flow: port(['pending', 'authorized']) })
    const started = await flow.start(ref, null)
    expect(started.value?.flowId).toBe('f1')
    const first = await flow.poll(started.value!)
    expect(first.value?.state).toBe('pending')
    expect(first.value?.round).toBe(1)
    const second = await flow.poll(first.value!)
    expect(second.value?.state).toBe('authorized')
    expect(second.value?.round).toBe(2)
  })

  it('T-10 旧轮次的答案不覆盖新轮次', async () => {
    const old = { flowId: 'f1', round: 1, state: 'pending' as const }
    const next = { flowId: 'f1', round: 2, state: 'authorized' as const }
    expect(mergeRound(next, old)).toEqual(next)
    expect(mergeRound(old, next)).toEqual(next)
  })
})

describe('T-34 发起签到', () => {
  it('begin 返回 flowId，轮次从 0 开始', async () => {
    const flow = {
      begin: async () => ({ ok: true, value: { flowId: 'f1' } }),
      status: async () => ({ ok: true, value: { state: 'pending' as const } }),
      submit: async () => ({ ok: true }),
      cancel: async () => ({ ok: true }),
    }
    const signIn = createSignInFlow({ flow })
    const started = await signIn.start({ scope: 'user', name: 'a' }, null)
    expect(started.value).toMatchObject({ flowId: 'f1', round: 0, state: 'pending' })
  })
})

describe('T-35 取消签到', () => {
  it('cancel 打到 flowId，不是清本地状态了事', async () => {
    const cancelled: string[] = []
    const flow = {
      begin: async () => ({ ok: true, value: { flowId: 'f9' } }),
      status: async () => ({ ok: true, value: { state: 'pending' as const } }),
      submit: async () => ({ ok: true }),
      cancel: async (id: string) => {
        cancelled.push(id)
        return { ok: true }
      },
    }
    const signIn = createSignInFlow({ flow })
    const started = await signIn.start({ scope: 'user', name: 'a' }, null)
    await signIn.cancel(started.value!)
    expect(cancelled).toEqual(['f9'])
  })
})
