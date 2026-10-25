/**
 * @design D-U-10 滚动意图：跟随 / 用户接管
 *
 * 语义来自 `useAgentSession.ts:handleScrollPositionChange`：流式追加时是否自动贴底，
 * 取决于"用户是不是自己往上翻了"。这不是渲染细节——判断错了要么看不到新内容，
 * 要么用户读历史时被强行拽回底部。
 */
export const SCROLL_TAIL_TOLERANCE = 24

export type ScrollIntent = 'follow' | 'hold'

export function distanceToTail(input: {
  scrollHeight: number
  scrollTop: number
  clientHeight: number
}): number {
  return Math.max(0, input.scrollHeight - input.scrollTop - input.clientHeight)
}

export function decideScrollIntent(
  input: { scrollHeight: number; scrollTop: number; clientHeight: number },
  previous: ScrollIntent = 'follow',
): ScrollIntent {
  return previous === 'hold'
    ? 'hold'
    : distanceToTail(input) <= SCROLL_TAIL_TOLERANCE
      ? 'follow'
      : 'hold'
}

/**
 * 用户显式滚动后：贴底 → 恢复跟随；离底 → 保持接管。
 * 与 `decideScrollIntent` 分开，是因为"流式追加"和"用户滚动"是两个事件源。
 */
export function intentAfterUserScroll(input: {
  scrollHeight: number
  scrollTop: number
  clientHeight: number
}): ScrollIntent {
  return distanceToTail(input) <= SCROLL_TAIL_TOLERANCE ? 'follow' : 'hold'
}
