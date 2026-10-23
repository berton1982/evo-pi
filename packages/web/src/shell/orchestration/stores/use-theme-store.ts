import { create } from 'zustand'

/**
 * Theme preference store（per spec §3.3 + ADR 0004）。
 *
 * 'light' / 'dark' / 'system' 三态；实际 DOM class 由 next-themes 管理
 * （AppProviders 内的 ThemeProvider）。本 store 只保存用户偏好，
 * 启动时通过 setTheme() 同步给 next-themes。
 *
 * Phase 0 不持久化（每次启动跟随系统）；后续 phase 加 persist 中间件
 * 落到 localStorage，per pi-web useTheme.ts STORAGE_KEY = 'pi-theme'。
 */

export type ThemePreference = 'light' | 'dark' | 'system'

interface ThemeState {
  theme: ThemePreference
  setTheme: (theme: ThemePreference) => void
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: 'system',
  setTheme: (theme) => {
    set({ theme })
  },
}))
