/**
 * i18n 公共导出（per pi-web lib/i18n/registry.ts pattern）。
 *
 * 使用方：
 *   import { translateMessage, SUPPORTED_LOCALES } from '@/lib/i18n'
 *   import { useLocaleStore } from '@/shell/orchestration/stores/use-locale-store'
 *   const locale = useLocaleStore(s => s.locale)
 *   const t = (key: string, params?: TranslationParams) =>
 *     translateMessage(locale, key, messages, params)
 */

export { interpolateMessage, translateMessage } from '@/lib/i18n/format'
export {
  getLocalePlugin,
  getMessagesByLocale,
  resolveBrowserLocale,
  SUPPORTED_LOCALES,
} from '@/lib/i18n/locale-registry'
export type { Locale, LocalePlugin, TranslationParams } from '@/lib/i18n/types'
