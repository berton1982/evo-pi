'use client'

import { create } from 'zustand'

/**
 * 对话框栈（shell 级）。
 *
 * 为什么要有栈而不是一堆布尔：
 * - pi-web 里设置弹窗之上还能叠"命令面板/确认框"，`settingsOpen` + `confirmOpen` 这种
 *   布尔组合会长成 2^n 个状态；栈让"谁在最上面"只有一个答案。
 * - Esc 只关最上面一层（`pop`），不是"全关"——后者会一次丢掉用户的编辑。
 *
 * 规矩：栈里只放 `id`（谁开的、开的是什么），内容由装配点按 `id` 渲染。
 * 这样 shell 不需要认识任何 feature 的对话框组件。
 */

export interface DialogEntry {
  id: string
  /** 打开时带的参数（如设置分区的 section id） */
  payload?: Record<string, unknown>
}

export interface DialogStackState {
  stack: DialogEntry[]
  push: (entry: DialogEntry) => void
  pop: () => void
  /** 关掉指定 id（深链或回退时用；不存在则无操作） */
  close: (id: string) => void
  closeAll: () => void
}

export const useDialogStack = create<DialogStackState>((set) => ({
  stack: [],
  push: (entry) =>
    set((s) => {
      // 同 id 再次打开 = 置顶（而不是叠两份），避免"点了两次设置出现两层设置"
      const rest = s.stack.filter((e) => e.id !== entry.id)
      return { stack: [...rest, entry] }
    }),
  pop: () => set((s) => ({ stack: s.stack.slice(0, -1) })),
  close: (id) => set((s) => ({ stack: s.stack.filter((e) => e.id !== id) })),
  closeAll: () => set({ stack: [] }),
}))

/** 栈顶 = 唯一可见的对话框；空栈时返回 null（不要用"最后一个非空"这种约定） */
export const topDialog = (stack: readonly DialogEntry[]): DialogEntry | null =>
  stack.length ? (stack[stack.length - 1] ?? null) : null
