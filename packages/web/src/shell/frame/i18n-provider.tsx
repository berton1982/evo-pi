'use client'

import type { ReactNode } from 'react'
import { createContext, useContext, useEffect, useMemo } from 'react'
import type { Locale, LocalePlugin, TranslationParams } from '@/lib/i18n'
import {
  getMessagesByLocale,
  resolveBrowserLocale,
  SUPPORTED_LOCALES,
  translateMessage,
} from '@/lib/i18n'
import { useLocaleStore } from '@/shell/orchestration/stores'

/**
 * I18nProvider — 把 useLocaleStore + translateMessage + getMessagesByLocale()
 * 串成 React Context，方便子树用 useI18n() hook 拿到 locale + t()。
 *
 * 启动行为：
 * - SSR: useLocaleStore 默认为 'en'（避免 hydration mismatch）。
 * - 浏览器首帧 effect 调 setLocale(resolveBrowserLocale(navigator.languages))
 *   覆盖到用户实际语言——与 pi-web useI18n.tsx:36-50 行为一致。
 *
 * Ruling — 自实现 I18nProvider（不用 react-i18next）：
 * Task 0.1 装了 i18next + react-i18next 但 Task 0.6 写了自实现的
 * translateMessage + getMessagesByLocale。保持一致性，使用自实现。
 * react-i18next 在 Phase 1+ 视需要再切换（lazy load / namespaces）。
 * Cost if wrong: trivial — Phase 0 只 10 个 placeholder key，依赖极简。
 */

interface I18nContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string, params?: TranslationParams) => string
  supportedLocales: readonly LocalePlugin[]
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const locale = useLocaleStore((s) => s.locale)
  const setLocale = useLocaleStore((s) => s.setLocale)

  // 一次性计算 messages + supportedLocales（每次 render 不变）
  const messages = useMemo(() => getMessagesByLocale(), [])
  const supportedLocales = useMemo<LocalePlugin[]>(
    () =>
      SUPPORTED_LOCALES.flatMap((id) => {
        const plugin = SUPPORTED_LOCALES.includes(id)
          ? { id, label: id, messages: messages[id] }
          : null
        return plugin ? [plugin as LocalePlugin] : []
      }),
    [messages],
  )

  // 浏览器首帧：localStorage → resolveBrowserLocale 覆盖
  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = window.localStorage?.getItem('evo-pi-locale')
    const next: Locale =
      stored === 'en' || stored === 'zh-CN' || stored === 'zh-TW'
        ? stored
        : resolveBrowserLocale(
            window.navigator?.languages?.length
              ? window.navigator.languages
              : [window.navigator.language],
          )
    if (next !== locale) {
      setLocale(next)
    }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = next
    }
  }, [locale, setLocale])

  const t = useMemo(
    () => (key: string, params?: TranslationParams) =>
      translateMessage(locale, key, messages, params),
    [locale, messages],
  )

  const value = useMemo<I18nContextValue>(
    () => ({ locale, setLocale, t, supportedLocales }),
    [locale, setLocale, t, supportedLocales],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used inside I18nProvider')
  }
  return context
}
