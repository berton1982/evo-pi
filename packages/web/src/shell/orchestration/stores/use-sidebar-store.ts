import { create } from 'zustand'

/**
 * Sidebar / Right-zone UI 状态（per ADR 0004：UI 状态走 zustand）。
 *
 * Phase 0 三个状态：
 * - sidebarOpen: 左侧 sidebar 是否可见（top bar toggle 控制）
 * - sidebarWidth: 当前宽度（px；ResizablePanel 拖拽时通过 setSidebarWidth 回写）
 * - rightPanelOpen: 右侧 panel 是否可见（top bar toggle 控制；当前 Phase 0 placeholder）
 *
 * 持久化交给 use-sidebar-prefs-store（per ADR 0004「持久化的 prefs 单独 store」）。
 * 当前 store 只 hold session 内存状态。
 */

interface SidebarState {
  sidebarOpen: boolean
  sidebarWidth: number
  rightPanelOpen: boolean
  setSidebarOpen: (open: boolean) => void
  setSidebarWidth: (width: number) => void
  toggleSidebar: () => void
  setRightPanelOpen: (open: boolean) => void
  toggleRightPanel: () => void
}

const DEFAULT_WIDTH = 260
const MIN_WIDTH = 200
const MAX_WIDTH = 480

export const useSidebarStore = create<SidebarState>((set) => ({
  sidebarOpen: true,
  sidebarWidth: DEFAULT_WIDTH,
  rightPanelOpen: false,
  setSidebarOpen: (open) => {
    set({ sidebarOpen: open })
  },
  setSidebarWidth: (width) => {
    const clamped = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, width))
    set({ sidebarWidth: clamped })
  },
  toggleSidebar: () => {
    set((state) => ({ sidebarOpen: !state.sidebarOpen }))
  },
  setRightPanelOpen: (open) => {
    set({ rightPanelOpen: open })
  },
  toggleRightPanel: () => {
    set((state) => ({ rightPanelOpen: !state.rightPanelOpen }))
  },
}))
