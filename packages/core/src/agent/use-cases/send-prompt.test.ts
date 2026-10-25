import { describe, expect, it, vi } from 'vitest'
import { initialSessionState } from '../domain/session-state'
import { decideExtensionUi } from './extension-ui'
import { initialChoices } from './initial-choices'
import { createNoticeQueue, nextSessionId } from './new-session'
import { createSendPrompt } from './send-prompt'

/** T-04 */
describe('initial choices（选项来源）', () => {
  it('模型列表缺省时兜底成当前模型，避免下拉框空白', () => {
    expect(initialChoices({ modelId: 'gpt-x' })).toMatchObject({
      model: 'gpt-x',
      models: ['gpt-x'],
    })
  })

  it('thinkingLevels 缺省给默认四档', () => {
    expect(initialChoices({}).thinkingLevels).toEqual(['off', 'low', 'medium', 'high'])
  })
})

describe('new session（发号与通知）', () => {
  it('发号用注入的生成器', () => {
    expect(nextSessionId(() => 'fixed-id')).toBe('fixed-id')
  })

  it('通知只留最近 limit 条', () => {
    const q = createNoticeQueue(2)
    q.add('info', 'a')
    q.add('info', 'b')
    q.add('warning', 'c')
    expect(q.list().map((n) => n.text)).toEqual(['b', 'c'])
  })
})

describe('extension UI（如实拒绝）', () => {
  it('拒绝并带 cancelled，避免插件一直挂着', () => {
    const d = decideExtensionUi({ id: 'req-1', method: 'confirm' })
    expect(d.kind).toBe('reject')
    expect(d.kind === 'reject' && d.respond.cancelled).toBe(true)
  })

  it('没有 id 时不回（回了也对不上）', () => {
    expect(decideExtensionUi({ id: '' }).kind).toBe('ignore')
  })
})

describe('send prompt（先准入再分发）', () => {
  const build = (phase: 'idle' | 'running') => {
    const dispatch = vi.fn(async () => ({ ok: true as const, value: { requestId: 7 } }))
    let dispatched = phase === 'idle'
    const send = createSendPrompt({
      state: () => ({ ...initialSessionState(), phase }),
      admit: () => {
        const ok = dispatched
        dispatched = true
        return { dispatched: ok }
      },
      dispatch,
    })
    return { send: send.send, dispatch }
  }

  it('运行中排队，不发请求', async () => {
    const { send, dispatch } = build('running')
    const res = await send({ text: '后面再说' })
    expect(res).toEqual({ kind: 'queued', reason: 'running' })
    expect(dispatch).not.toHaveBeenCalled()
  })

  it('空闲时发出，并把 requestId 带回来', async () => {
    const { send, dispatch } = build('idle')
    const res = await send({ text: '你好', clientRequestId: 'k1' })
    expect(res).toEqual({ kind: 'dispatched', requestId: 7 })
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ command: 'prompt', clientRequestId: 'k1' }),
    )
  })

  it('空文本直接拒，不进入准入', async () => {
    const { send, dispatch } = build('idle')
    expect(await send({ text: '   ' })).toEqual({ kind: 'rejected', code: 'empty' })
    expect(dispatch).not.toHaveBeenCalled()
  })
})
