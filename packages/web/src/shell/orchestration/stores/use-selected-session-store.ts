import { create } from 'zustand'

/**
 * use-selected-session-store — UI state for which session is currently focused
 * (per ADR 0004: UI 状态走 zustand).
 *
 * Phase 1 minimum:
 * - selectedSessionId: id of the session the user clicked in sidebar
 * - setSelectedSessionId: setter
 *
 * Phase 2+ will extend with session-scoped state (e.g., draft input, scroll
 * position) — PR.D stub OK for placeholder detail panel assertion.
 */

interface SelectedSessionState {
  selectedSessionId: string | undefined
  setSelectedSessionId: (id: string | undefined) => void
}

export const useSelectedSessionStore = create<SelectedSessionState>((set) => ({
  selectedSessionId: undefined,
  setSelectedSessionId: (id) => {
    set({ selectedSessionId: id })
  },
}))
