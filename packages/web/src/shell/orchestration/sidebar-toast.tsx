'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

/**
 * SidebarToast — empty portal (per spec §4.2.5).
 *
 * Phase 0 不渲染任何 toast；后续 capability 通过 store dispatch 添加。
 *
 * See SidebarMenu ruling — same mount-gated portal pattern to avoid
 * SSR hydration mismatch.
 */
export function SidebarToast(): React.JSX.Element | null {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || typeof document === 'undefined') return null
  return createPortal(<div data-component="sidebar-toast-portal" hidden />, document.body)
}
