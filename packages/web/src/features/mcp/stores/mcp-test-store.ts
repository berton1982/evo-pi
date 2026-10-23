/**
 * @design ST-03
 *
 * 测试状态与"撤销条"。
 *
 * 为什么测试结果单独一个 store：测试是长动作（每个服务器可能几秒），
 * 结果必须能按 key 回填，且组件卸载后结果仍然有效（用户在测试时切走了）。
 * 撤销条只保留最近一次动作——pi-web 的 `undo` 也是单条（`McpConfig.tsx:733`）。
 */

import type { McpTestResult } from '@evo-pi/core/mcp'
import { create } from 'zustand'

export interface UndoRecord {
  key: string
  enabled: boolean
  /** 撤销条自动消失的时间戳，0 表示常驻（批量动作） */
  expiresAt: number
}

export interface McpTestState {
  results: Record<string, McpTestResult>
  running: string[]
  undo: UndoRecord | null
  setResult: (key: string, result: McpTestResult) => void
  start: (key: string) => void
  finish: (key: string) => void
  setUndo: (undo: UndoRecord | null) => void
  reset: () => void
}

/**
 * 撤销是否还可用：`expiresAt === 0` 表示常驻（批量动作没有自动消失）。
 * 判断放在这里而不是组件里，是为了让"过期后点撤销"这条负例可被单测覆盖。
 */
export function isUndoUsable(undo: UndoRecord | null, now: number): boolean {
  if (!undo) return false
  return undo.expiresAt === 0 || undo.expiresAt > now
}

export const useMcpTestStore = create<McpTestState>((set) => ({
  results: {},
  running: [],
  undo: null,
  setResult: (key, result) => set((s) => ({ results: { ...s.results, [key]: result } })),
  start: (key) =>
    set((s) => ({ running: s.running.includes(key) ? s.running : [...s.running, key] })),
  finish: (key) => set((s) => ({ running: s.running.filter((k) => k !== key) })),
  setUndo: (undo) => set({ undo }),
  reset: () => set({ results: {}, running: [], undo: null }),
}))
