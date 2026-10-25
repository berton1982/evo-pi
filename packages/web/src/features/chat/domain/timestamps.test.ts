import { describe, expect, it } from 'vitest'
import { formatTimestamp, isSameMinute, shouldShowTimestamp } from './timestamps'

describe('timestamps', () => {
  const at = (iso: string): number => Date.parse(iso)

  it('按本地时区格式化到分钟', () => {
    expect(formatTimestamp(at('2026-10-20T08:03:45'))).toBe('08:03')
  })

  it('缺值或非法值返回 null（不显示假时间）', () => {
    expect(formatTimestamp(undefined)).toBeNull()
    expect(formatTimestamp(Number.NaN)).toBeNull()
  })

  it('同一分钟判为重复，跨分钟/跨天不重复', () => {
    expect(isSameMinute(at('2026-10-20T08:03:01'), at('2026-10-20T08:03:59'))).toBe(true)
    expect(isSameMinute(at('2026-10-20T08:03:01'), at('2026-10-20T08:04:01'))).toBe(false)
    expect(isSameMinute(at('2026-10-20T08:03:01'), at('2026-10-21T08:03:01'))).toBe(false)
  })

  it('首条显示，同分钟后续条目不显示', () => {
    const first = at('2026-10-20T08:03:10')
    const same = at('2026-10-20T08:03:50')
    const next = at('2026-10-20T08:09:00')
    expect(shouldShowTimestamp(first, null)).toBe(true)
    expect(shouldShowTimestamp(same, first)).toBe(false)
    expect(shouldShowTimestamp(next, same)).toBe(true)
  })
})
