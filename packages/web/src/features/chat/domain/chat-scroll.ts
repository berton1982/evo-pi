/**
 * @design D-U-05
 * 消息列表的滚动几何：只做算术，不碰 DOM。
 *
 * 移植自 `ref_projects/pi-web/lib/chat-lazy-load.ts:18-40`（T-05 观测）。
 * 之所以单独成文件：这三条公式决定"加载更多历史时会不会跳",
 * 只要有一点偏差（比如用了 scrollTop 而不是"距底部距离"）就会在真机上闪，
 * 而闪一旦出现，肉眼很难判断是哪一步错的——所以要能单独测。
 */

/** 距底部多少像素内算"贴着底"：pi-web 用的是 24，这里保持一致，改了就换了手感 */
export const CHAT_SCROLL_TAIL_TOLERANCE = 24

/** 距底部的距离（不是 scrollTop：插入内容后 scrollTop 不变、距底部会变） */
export function captureScrollDistance(scrollHeight: number, scrollTop: number): number {
  return scrollHeight - scrollTop
}

/** 恢复：把"距底部距离"还原成新的 scrollTop（历史被追加在上方时，用户视野不该动） */
export function restoreScrollTop(scrollHeight: number, savedDistance: number): number {
  return Math.max(0, scrollHeight - savedDistance)
}

export function isScrollAtTail(
  scrollTop: number,
  clientHeight: number,
  scrollHeight: number,
  tolerance = CHAT_SCROLL_TAIL_TOLERANCE,
): boolean {
  return scrollTop + clientHeight >= scrollHeight - tolerance
}

/**
 * 是否继续跟随实时输出。
 *
 * 规则（照搬 pi-web）：本来在跟随且用户没有上滚 → 继续跟随；
 * 用户主动上滚超过容差 → 断开跟随（否则用户往上翻历史时会被拽回底部）。
 */
export function getLiveFollowAttached(
  wasAttached: boolean,
  previousScrollTop: number,
  scrollTop: number,
  clientHeight: number,
  scrollHeight: number,
  tolerance = CHAT_SCROLL_TAIL_TOLERANCE,
): boolean {
  if (scrollTop < previousScrollTop - tolerance) return false
  if (!wasAttached) return isScrollAtTail(scrollTop, clientHeight, scrollHeight, tolerance)
  return true
}
