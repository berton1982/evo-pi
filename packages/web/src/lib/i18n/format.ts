import type { Locale, TranslationParams } from '@/lib/i18n/types'

/**
 * 翻译消息字典索引：locale → (key → message)。
 *
 * 设计：Phase 0 三个 locale 各自一份完整 messages；查找时优先当前 locale，
 * 缺失时回退 en（与 pi-web lib/i18n/format.ts:translateMessage 一致）。
 */
type MessagesByLocale = Record<Locale, Readonly<Record<string, string>>>

/**
 * 替换翻译消息中的简单插值占位符（{name} 语法，per pi-web format.ts:8）。
 *
 * 简单 `{key}` 替换，无嵌套、无转义。Phase 0 仅用于 placeholder 文案。
 * 未来若需 plural / nested 等高级特性，迁移至 i18next 的 ICU MessageFormat。
 */
export function interpolateMessage(message: string, params: TranslationParams = {}): string {
  return message.replace(/\{([\w.-]+)\}/g, (token, name: string) => {
    const value = params[name]
    return value === undefined ? token : String(value)
  })
}

/**
 * 解析消息：当前 locale → en 回退 → key（最后兜底）。
 *
 * 设计：避免 UI 因为翻译缺失显示空白；显示 key 让缺译可见。
 */
export function translateMessage(
  locale: Locale,
  key: string,
  messages: MessagesByLocale,
  params: TranslationParams = {},
): string {
  const message = messages[locale]?.[key] ?? messages.en?.[key] ?? key
  return interpolateMessage(message, params)
}
