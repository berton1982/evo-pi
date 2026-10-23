'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

/**
 * SidebarMenu — empty portal (per spec §4.2.5).
 *
 * Phase 0 不渲染任何内容；右键 / [+]/[🔍] 等菜单后续 PR 接入。
 *
 * Ruling — mount-gated portal to avoid SSR hydration mismatch:
 *   createPortal(<div />, document.body) runs during Next.js SSR (where
 *   document exists in a jsdom-like global). React then compares the
 *   server-rendered DOM to the client DOM and finds the portalled div
 *   missing on the server (Next.js renders the body without it during
 *   the RSC payload assembly). The fix is to only portal after mount.
 */
export function SidebarMenu(): React.JSX.Element | null {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || typeof document === 'undefined') return null
  return createPortal(<div data-component="sidebar-menu-portal" hidden />, document.body)
}
