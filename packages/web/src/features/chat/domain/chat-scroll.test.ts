import { describe, expect, it } from 'vitest'
import {
  captureScrollDistance,
  getLiveFollowAttached,
  isScrollAtTail,
  restoreScrollTop,
} from './chat-scroll'

describe('chat-scroll（T-05 滚动几何）', () => {
  it('captureScrollDistance 是距底部距离，不是 scrollTop', () => {
    expect(captureScrollDistance(1000, 200)).toBe(800)
  })

  it('restoreScrollTop 与 capture 互为逆运算（历史追加后仍贴住原视野）', () => {
    expect(restoreScrollTop(1000, 800)).toBe(200)
    // 追加 300px 历史后：新的 scrollTop 应比原来多 300，距底部距离不变
    expect(restoreScrollTop(1300, 800)).toBe(500)
  })

  it('restoreScrollTop 不会返回负数', () => {
    expect(restoreScrollTop(100, 800)).toBe(0)
  })

  it('isScrollAtTail 用"距底 ≤ 容差"判定，容差可覆盖', () => {
    expect(isScrollAtTail(700, 300, 1000)).toBe(true)
    expect(isScrollAtTail(600, 300, 1000)).toBe(false)
    expect(isScrollAtTail(600, 300, 1000, 100)).toBe(true)
  })

  it('用户上滚超过容差就断开跟随（不被拽回底部）', () => {
    expect(getLiveFollowAttached(true, 700, 600, 300, 1000)).toBe(false)
  })

  it('跟随中且用户没有上滚就继续跟随', () => {
    expect(getLiveFollowAttached(true, 700, 705, 300, 1000)).toBe(true)
  })

  it('回落到底部时重新接上跟随', () => {
    expect(getLiveFollowAttached(false, 400, 700, 300, 1000)).toBe(true)
  })
})
