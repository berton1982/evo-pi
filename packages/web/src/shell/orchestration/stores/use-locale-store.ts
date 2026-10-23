import { create } from 'zustand'

import type { Locale } from '@/lib/i18n'

/**
 * Locale store + persist 中间件（per pi-web useI18n.tsx LOCALE_STORAGE_KEY
 * 模式，但用 zustand persist 替代手写 localStorage）。
 *
 * 启动行为：
 * - Phase 0 暂时不做 SSR hydration；store 默认 'en'，浏览器侧由
 *   AppProviders 的 effect 调 setLocale(resolveBrowserLocale(...))。
 * - 后续 phase 可加 zustand persist 中间件 + partialize 避免 SSR mismatch。
 */

interface LocaleState {
  locale: Locale
  setLocale: (locale: Locale) => void
}

export const useLocaleStore = create<LocaleState>((set) => ({
  locale: 'en',
  setLocale: (locale) => {
    set({ locale })
  },
}))
