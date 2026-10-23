import type { ReactNode } from 'react'

/**
 * LayoutProps — pure slot interface for the 3-zone AppShell.
 *
 * Slots (per spec §3.1 + plan §0.9):
 * - top:    inside Center zone, at top (TopBar)
 * - center: inside Center zone, below top (ChatWindow / CenterZone)
 * - left:   Left zone (SessionSidebar + sidebar-footer stacked)
 * - right:  Right zone (TabBar + FileViewer / TerminalPanel)
 *
 * Layout.tsx MUST NOT:
 * - Hold local state (useState)
 * - Subscribe to zustand stores directly (let children do it)
 * - Wire event handlers to side effects (pure slot composition)
 */
export interface LayoutProps {
  top: ReactNode
  center: ReactNode
  left: ReactNode
  right: ReactNode
  /** Initial sidebar width (ResizablePanel defaultSize); passed to Layout for clarity */
  sidebarWidth?: number
  /** Fired on sidebar resize with new pixel width; Layout just forwards */
  onSidebarResize?: (width: number) => void
}
