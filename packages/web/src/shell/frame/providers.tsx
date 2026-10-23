'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import type { ReactNode } from 'react'
import { useMemo } from 'react'

import { I18nProvider } from '@/shell/frame/i18n-provider'
import { useThemeStore } from '@/shell/orchestration/stores'

/**
 * AppProviders — 整个 web 应用的 Provider 根（per spec §3.2）。
 *
 * 嵌套顺序：
 *   ThemeProvider (next-themes class strategy)
 *     → I18nProvider (zustand locale + translateMessage)
 *       → QueryClientProvider (@tanstack/react-query, 5min staleTime)
 *         → { children }
 *
 * 设计理由（per spec §2.1）：
 * - Theme 必须最外层：DOM <html> class 在 layout 阶段就需要
 * - I18n 紧接 Theme：locale 切换可能影响所有子树
 * - QueryClientProvider 在内：仅业务逻辑需要，与 DOM 解耦
 *
 * **不要** 把 useState / URL sync / event bus 塞进 AppProviders；
 * AppShell 是 presentational，所有状态走 zustand（per ADR 0004）。
 */
export function AppProviders({ children }: { children: ReactNode }): React.JSX.Element {
  // QueryClient 单例 per Provider 实例（避免 SSR 共享 client 时的 request 串扰）
  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5min default; per-use-case 覆盖
            refetchOnWindowFocus: false, // Phase 0 placeholder；后续按 capability 调整
          },
        },
      }),
    [],
  )

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme={useThemeStore.getState().theme}
      enableSystem
    >
      <I18nProvider>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </I18nProvider>
    </NextThemesProvider>
  )
}
