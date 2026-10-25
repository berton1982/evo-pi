import { describe, expect, it } from 'vitest'
import { decideScrollIntent, distanceToTail, intentAfterUserScroll } from './scroll-intent'
import { emptySessionData, isNewSession, normalizeSessionData } from './session-data'
import { createFlightTracker, promoteNewSession } from './session-flight'

/** T-04 */
describe('session data（T-04 形状与归一）', () => {
  it('缺字段落到明确的空，而不是 undefined', () => {
    const data = normalizeSessionData({ sessionId: 's1' })
    expect(data).toEqual({
      sessionId: 's1',
      cwd: null,
      phase: 'idle',
      isNew: false,
      model: null,
      thinkingLevel: null,
    })
  })

  it('未知 phase 不猜成 running', () => {
    expect(normalizeSessionData({ phase: 'weird' }).phase).toBe('idle')
  })

  it('新会话 = 有 id 且未落盘；没有 id 不算新会话', () => {
    expect(isNewSession({ ...emptySessionData(), sessionId: 'x', isNew: true })).toBe(true)
    expect(isNewSession({ ...emptySessionData(), sessionId: null, isNew: true })).toBe(false)
  })
})

describe('flight tracker（T-04 飞行标记）', () => {
  it('只认当前 requestId 的回包', () => {
    const t = createFlightTracker()
    t.begin('s1', 2)
    expect(t.isInFlight('s1', 2)).toBe(true)
    expect(t.isInFlight('s1', 1)).toBe(false)
    expect(t.busy()).toBe(true)
    t.end('s1')
    expect(t.busy()).toBe(false)
  })

  it('新会话被提升后 isNew 清掉，id 保留', () => {
    const promoted = promoteNewSession({ sessionId: 'x', isNew: true })
    expect(promoted).toEqual({ sessionId: 'x', isNew: false })
  })
})

describe('scroll intent（T-04 跟随/接管）', () => {
  it('离底超过容差 → hold；贴底 → follow', () => {
    const far = { scrollHeight: 1000, scrollTop: 100, clientHeight: 300 }
    expect(distanceToTail(far)).toBe(600)
    expect(decideScrollIntent(far)).toBe('hold')
    expect(decideScrollIntent({ scrollHeight: 1000, scrollTop: 690, clientHeight: 300 })).toBe(
      'follow',
    )
  })

  it('一旦用户接管，流式追加不会把他拽回底部', () => {
    expect(
      decideScrollIntent({ scrollHeight: 1000, scrollTop: 690, clientHeight: 300 }, 'hold'),
    ).toBe('hold')
    expect(intentAfterUserScroll({ scrollHeight: 1000, scrollTop: 700, clientHeight: 300 })).toBe(
      'follow',
    )
  })
})
