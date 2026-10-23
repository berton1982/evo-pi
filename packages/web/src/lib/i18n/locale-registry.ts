import { enLocale } from '@/lib/i18n/messages/en'
import { zhCNLocale } from '@/lib/i18n/messages/zh-CN'
import { zhTWLocale } from '@/lib/i18n/messages/zh-TW'
import type { Locale, LocalePlugin } from '@/lib/i18n/types'

/**
 * 注册顺序就是 UI 语言切换菜单显示顺序。
 * 优先级：en（默认 fallback）→ zh-CN（简体）→ zh-TW（繁体）。
 */
const localePlugins: readonly LocalePlugin[] = [enLocale, zhCNLocale, zhTWLocale]

export const SUPPORTED_LOCALES: readonly Locale[] = localePlugins.map((p) => p.id)

/**
 * 按 id 查找语言包。找不到返回 undefined（调用方负责兜底到 en）。
 */
export function getLocalePlugin(id: Locale): LocalePlugin | undefined {
  return localePlugins.find((plugin) => plugin.id === id)
}

/**
 * 浏览器语言 → 内置 Locale 解析（per pi-web lib/i18n/registry.ts:30）。
 *
 * 优先级：精确 / 前缀匹配 zh-Hans/zh-Hant 字符集；其他 zh-* → zh-CN。
 * 找不到匹配时回退 en。
 */
export function resolveBrowserLocale(navigatorLanguages: readonly string[]): Locale {
  for (const language of navigatorLanguages) {
    const normalized = language.toLowerCase()
    if (normalized === 'en' || normalized.startsWith('en-')) return 'en'
    if (
      normalized === 'zh' ||
      normalized === 'zh-cn' ||
      normalized.startsWith('zh-cn-') ||
      normalized === 'zh-sg' ||
      normalized.startsWith('zh-sg-') ||
      normalized === 'zh-hans' ||
      normalized.startsWith('zh-hans-')
    ) {
      return 'zh-CN'
    }
    if (
      normalized === 'zh-tw' ||
      normalized.startsWith('zh-tw-') ||
      normalized === 'zh-hk' ||
      normalized.startsWith('zh-hk-') ||
      normalized === 'zh-mo' ||
      normalized.startsWith('zh-mo-') ||
      normalized === 'zh-hant' ||
      normalized.startsWith('zh-hant-')
    ) {
      return 'zh-TW'
    }
    if (normalized.startsWith('zh-')) return 'zh-CN'
  }
  return 'en'
}

/**
 * 收集所有 locale 的 messages 字典，供 translateMessage() 一次性查找。
 * 返回 Record<Locale, ...>，避免每个 use-case 重新遍历 localePlugins。
 */
export function getMessagesByLocale(): Record<Locale, Readonly<Record<string, string>>> {
  const result = {} as Record<Locale, Readonly<Record<string, string>>>
  for (const plugin of localePlugins) {
    result[plugin.id] = plugin.messages
  }
  return result
}
