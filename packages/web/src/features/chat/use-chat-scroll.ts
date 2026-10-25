'use client'

/**
 * @design H-01
 * 把滚动几何绑到 DOM 上：容器引用、是否跟随实时输出、加载更多历史时的存取。
 *
 * 算术全在 本能力的 `index.ts`（`chat-scroll.ts`，L1 有测试）；
 * 这里只做三件 DOM 事：读尺寸、写 scrollTop、在用户滚动时更新跟随状态。
 * 这也是 T-05 观测里 pi-web 的分工（`ChatWindow.tsx:529` 调纯函数，
 * DOM 只在 `scrollContainerRef` 这一处）。
 */
import { useCallback, useRef, useState } from 'react'
import { captureScrollDistance, getLiveFollowAttached, restoreScrollTop } from './index'

export interface ChatScrollApi {
  containerRef: React.RefObject<HTMLDivElement | null>
  /** 是否还跟随实时输出（用户上滚就断开） */
  atTail: boolean
  /** 绑到容器的 onScroll */
  handleScroll: () => void
  /** 追加历史前调用：返回"距底部距离" */
  capture: () => number
  /** 追加历史后调用：按快照复位视野（不跳） */
  restore: (savedDistance: number) => void
  /** 贴到最底部（新消息到达、首屏加载完成时用；用户上滚后调用方不该再调） */
  stick: () => void
}

export function useChatScroll(): ChatScrollApi {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const previousScrollTopRef = useRef(0)
  const [atTail, setAtTail] = useState(true)

  const handleScroll = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const scrollTop = el.scrollTop
    setAtTail((was) =>
      getLiveFollowAttached(
        was,
        previousScrollTopRef.current,
        scrollTop,
        el.clientHeight,
        el.scrollHeight,
      ),
    )
    previousScrollTopRef.current = scrollTop
  }, [])

  const capture = useCallback(() => {
    const el = containerRef.current
    // 没有容器时返回 0：调用方拿到 0 再 restore 等于"什么都不做"，比抛错更适合首帧
    return el ? captureScrollDistance(el.scrollHeight, el.scrollTop) : 0
  }, [])

  const restore = useCallback((savedDistance: number) => {
    const el = containerRef.current
    if (!el || savedDistance === 0) return
    el.scrollTop = restoreScrollTop(el.scrollHeight, savedDistance)
    previousScrollTopRef.current = el.scrollTop
  }, [])

  const stick = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
    previousScrollTopRef.current = el.scrollTop
  }, [])

  return { containerRef, atTail, handleScroll, capture, restore, stick }
}
