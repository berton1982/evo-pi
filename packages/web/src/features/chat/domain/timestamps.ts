/**
 * @design D-U-12
 * 时间戳的显示规则（纯函数，便于测试）。
 *
 * 依据 `ref_projects/pi-web/components/MessageView.tsx:242`（`formatTime`）与
 * `:726`（相邻消息同一分钟内不再重复显示）：
 * - 只到分钟（秒级噪音没有信息量）
 * - 与上一条同一分钟 → 不显示（连续几句对话里每句都挂一个 08:03 是噪音）
 */
export function formatTimestamp(ts?: number | null): string | null {
  if (typeof ts !== 'number' || !Number.isFinite(ts)) return null
  const date = new Date(ts)
  if (Number.isNaN(date.getTime())) return null
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

/** 同一分钟（同年同月同日同时同分）才算重复；跨天同分不算 */
export function isSameMinute(previous?: number | null, current?: number | null): boolean {
  if (typeof previous !== 'number' || typeof current !== 'number') return false
  const a = new Date(previous)
  const b = new Date(current)
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate() &&
    a.getHours() === b.getHours() &&
    a.getMinutes() === b.getMinutes()
  )
}

/** 这条消息该不该显示时间：有值、且不与上一条同分钟 */
export function shouldShowTimestamp(current?: number | null, previous?: number | null): boolean {
  if (formatTimestamp(current) === null) return false
  return !isSameMinute(previous, current)
}
