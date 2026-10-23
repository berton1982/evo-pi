import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Sidebar 持久化偏好（per ADR 0004「持久化 prefs 单独 store」）。
 *
 * 与 use-sidebar-store 区分：那个 hold session 内存状态（panel width / open），
 * 这个 hold 跨 session 持久化偏好（pinned / showIgnored）。phase 0 placeholder
 * 字段，后续 PR 按需扩展（如 sidebar position、default tab）。
 *
 * 持久化：zustand persist 中间件 + localStorage 'evo-pi-sidebar-prefs'。
 * 注意 SSR 场景需配合 skipHydration: true，Phase 0 仅 client render，暂不处理。
 */

interface SidebarPrefsState {
  pinned: boolean
  showIgnored: boolean
  setPinned: (pinned: boolean) => void
  setShowIgnored: (showIgnored: boolean) => void
}

export const useSidebarPrefsStore = create<SidebarPrefsState>()(
  persist(
    (set) => ({
      pinned: false,
      showIgnored: false,
      setPinned: (pinned) => {
        set({ pinned })
      },
      setShowIgnored: (showIgnored) => {
        set({ showIgnored })
      },
    }),
    {
      name: 'evo-pi-sidebar-prefs',
    },
  ),
)
