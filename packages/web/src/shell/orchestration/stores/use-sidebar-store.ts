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
  /** 文件面板"全宽"：把右侧面板撑到一半以上（pi-web 顶栏有这个按钮，位置一致） */
  rightPanelFull: boolean
  setSidebarOpen: (open: boolean) => void
  setSidebarWidth: (width: number) => void
  toggleSidebar: () => void
  setRightPanelOpen: (open: boolean) => void
  toggleRightPanel: () => void
  setRightPanelFull: (full: boolean) => void
  toggleRightPanelFull: () => void
}

const DEFAULT_WIDTH = 260
const MIN_WIDTH = 200
const MAX_WIDTH = 480

export const useSidebarStore = create<SidebarState>((set) => ({
  sidebarOpen: true,
  sidebarWidth: DEFAULT_WIDTH,
  // 默认展开：pi-web 打开时右栏就显示（文件/详情），关着的默认态会让"隐藏文件面板"
  // 这类入口在保真对比里永远采不到，也不是用户期望的初始界面
  rightPanelOpen: true,
  rightPanelFull: false,
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
  setRightPanelFull: (full) => {
    // 打开"全宽"必然意味着面板要可见（否则按钮点了没反应）；关掉时保留当前可见性
    set((state) => ({ rightPanelFull: full, rightPanelOpen: full ? true : state.rightPanelOpen }))
  },
  toggleRightPanelFull: () => {
    set((state) => ({ rightPanelFull: !state.rightPanelFull, rightPanelOpen: true }))
  },
}))
