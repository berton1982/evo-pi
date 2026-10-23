/**
 * Sidebar types (per spec §4.2 + plan §0.10).
 *
 * Sidebar 是 tab-driven UI（两个 tab: Sessions / Files）。
 * Container 持有唯一状态：当前 tab。其它子组件各自管自己的 UI state。
 */

export type SidebarTab = 'sessions' | 'files'

export interface SidebarProps {
  cwd?: string
  /** 当前 sidebar 宽度（px），由 Layout 通过 onSidebarResize 回调同步 */
  sidebarWidth?: number
  /** Sidebar 宽度变化回调（持久化由 zustand useSidebarStore 负责） */
  onResize?: (width: number) => void
  /**
   * Row click handler — caller owns the side effect.
   * PR.D follow-up: pages pass a callback that pushes ?session=<id>
   * to the URL, so click → URL change → back/forward → refresh all work.
   * Required (no default) so a missing handler is a type error.
   */
  onSelectSession: (id: string) => void
  /** Currently selected session id (from URL ?session=…). Used for aria-current. */
  selectedSessionId?: string
}
