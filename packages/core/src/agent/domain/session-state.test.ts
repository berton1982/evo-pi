import { describe, expect, it, test } from 'vitest'
import { messageKey, parseMessageKey } from './message-keys'
import { acceptEvent, admit, finishTurn, initialSessionState } from './session-state'

/** T-01 */
describe('session state（T-01 准入与事件新旧）', () => {
  it('接受同号（同一轮的多个事件）但丢弃旧号', () => {
    const s = initialSessionState()
    expect(acceptEvent(s, 5)).toBe(true)
    // 同一轮里 message_start 之后还有 text_delta / message_end，都带同一个 requestId
    expect(acceptEvent(s, 5)).toBe(true)
    expect(acceptEvent(s, 4)).toBe(false) // 上一轮事件的乱序到达
    expect(acceptEvent(s, 6)).toBe(true)
  })

  it('运行中提交变成排队，不打断当前轮次', () => {
    let s = initialSessionState()
    s = { ...s, phase: 'running' }
    s = admit(s)
    expect(s.phase).toBe('running')
    expect(s.queued).toBe(1)
    expect(admit(s).queued).toBe(2)
  })

  it('空闲时提交直接进入 starting', () => {
    const s = admit(initialSessionState())
    expect(s.phase).toBe('starting')
    expect(s.queued).toBe(0)
  })

  it('一轮结束后清空排队并回到 idle', () => {
    const s = finishTurn({ phase: 'running', lastRequestId: 9, queued: 3 })
    expect(s.phase).toBe('idle')
    expect(s.queued).toBe(0)
    expect(s.lastRequestId).toBe(9) // requestId 不因一轮结束回退，否则旧事件会被再次接受
  })
})

/** T-02 */
describe('message key（T-02 块级定位）', () => {
  it('拼出与解析互逆', () => {
    const key = messageKey({ entryId: 'abc', blockIndex: 3 })
    expect(key).toBe('abc#3')
    expect(parseMessageKey(key)).toEqual({ entryId: 'abc', blockIndex: 3 })
  })

  it('解析不出来返回 null，而不是 0', () => {
    expect(parseMessageKey('abc')).toBeNull()
    expect(parseMessageKey('abc#x')).toBeNull()
    expect(parseMessageKey('#2')).toBeNull()
  })
})

describe('acceptEvent 的边界', () => {
  test('同一轮的后续事件不该被当成旧响应', () => {
    const state = initialSessionState()
    // 一轮里三个事件共享 requestId=1
    expect(acceptEvent(state, 1)).toBe(true)
    expect(acceptEvent(state, 1)).toBe(true)
    expect(acceptEvent(state, 1)).toBe(true)
  })

  test('更小的 requestId 仍然丢弃（乱序到达的上一轮事件）', () => {
    const state = initialSessionState()
    acceptEvent(state, 2)
    expect(acceptEvent(state, 1)).toBe(false)
    expect(state.lastRequestId).toBe(2)
  })
})
