/**
 * i18n 公共类型（per capability-boundary-final §ADR 0004 + study #1 AppShell）。
 *
 * Phase 0 仅 3 个 locale；后续 phase 按需扩展。
 *
 * 注释：用 string 字面量联合而非 enum —— 与 pi-web lib/i18n/types.ts:3 一致。
 * enum 会引入运行时开销且与 TS 严格模式 (noUncheckedIndexedAccess) 不友好。
 */

export type Locale = 'en' | 'zh-CN' | 'zh-TW'

export type TranslationParams = Record<string, string | number>

export interface LocalePlugin {
  /** Locale 唯一标识 */
  readonly id: Locale
  /** 显示名称（用于语言切换菜单） */
  readonly label: string
  /** 以稳定 key 索引的翻译消息 */
  readonly messages: Readonly<Record<string, string>>
}
