/**
 * @design ST-02
 *
 * 选中的服务器（唯一持有者：`selectedKey`，形如 `user/ctx7`）。
 *
 * 为什么要单独一个 store 而不是塞进 ST-01：清单会整体刷新（加载、批量、重连），
 * 选中项不该跟着重置；反过来选中项变化也不该触发清单重新渲染。
 * 持久化：pi-web 记在 `localStorage` 的 `getLastSettingsSelection('mcp', cwd)`（行为 B-002），
 * 这里只存内存 + 由组合根负责读写持久层。
 */
import { create } from 'zustand'

export interface McpSelectionState {
  selectedKey: string | null
  select: (key: string | null) => void
  reset: () => void
}

export const useMcpSelectionStore = create<McpSelectionState>((set) => ({
  selectedKey: null,
  select: (selectedKey) => set({ selectedKey }),
  reset: () => set({ selectedKey: null }),
}))

/** 清单刷新后选中项可能已消失：由调用方决定回落到第一条还是清空 */
export function reconcileSelection(
  selectedKey: string | null,
  availableKeys: string[],
): string | null {
  if (selectedKey && availableKeys.includes(selectedKey)) return selectedKey
  return availableKeys[0] ?? null
}
