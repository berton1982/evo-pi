import { describe, expect, it } from 'vitest'
import { interpolateMessage, translateMessage } from '@/lib/i18n/format'
import {
  getLocalePlugin,
  getMessagesByLocale,
  resolveBrowserLocale,
  SUPPORTED_LOCALES,
} from '@/lib/i18n/locale-registry'
import type { Locale } from '@/lib/i18n/types'

describe('i18n', () => {
  describe('interpolateMessage', () => {
    it('replaces {name} tokens with values', () => {
      expect(interpolateMessage('Hello {name}', { name: 'world' })).toBe('Hello world')
    })

    it('leaves tokens intact when params are missing', () => {
      expect(interpolateMessage('Hello {name}')).toBe('Hello {name}')
    })

    it('handles dot and dash in token names', () => {
      expect(interpolateMessage('a {a.b-c} b', { 'a.b-c': 'X' })).toBe('a X b')
    })

    it('coerces numeric params to string', () => {
      expect(interpolateMessage('count = {n}', { n: 42 })).toBe('count = 42')
    })
  })

  describe('translateMessage', () => {
    const messages = getMessagesByLocale()

    it('returns translated string for current locale', () => {
      expect(translateMessage('en', 'app.title', messages)).toBe('evo-pi')
      expect(translateMessage('zh-CN', 'app.title', messages)).toBe('evo-pi')
    })

    it('falls back to en when key missing in current locale', () => {
      // Force a locale that does not have the key by using a synthetic messages map.
      const sparse = {
        en: { 'custom.key': 'English value' },
        'zh-CN': {},
        'zh-TW': {},
      } as unknown as Record<Locale, Readonly<Record<string, string>>>
      expect(translateMessage('zh-CN', 'custom.key', sparse)).toBe('English value')
    })

    it('falls back to the key itself when neither current locale nor en has it', () => {
      const sparse = {
        en: {},
        'zh-CN': {},
        'zh-TW': {},
      } as unknown as Record<Locale, Readonly<Record<string, string>>>
      expect(translateMessage('zh-CN', 'missing.key', sparse)).toBe('missing.key')
    })

    it('interpolates params in translated message', () => {
      const customMessages = {
        en: { greet: 'Hi {name}' },
        'zh-CN': { greet: '你好 {name}' },
        'zh-TW': { greet: '你好 {name}' },
      } as unknown as Record<Locale, Readonly<Record<string, string>>>
      expect(translateMessage('zh-CN', 'greet', customMessages, { name: '小李' })).toBe('你好 小李')
    })
  })

  describe('SUPPORTED_LOCALES', () => {
    it('lists en, zh-CN, zh-TW in that order', () => {
      expect(SUPPORTED_LOCALES).toEqual(['en', 'zh-CN', 'zh-TW'])
    })

    it('getLocalePlugin returns each registered locale', () => {
      expect(getLocalePlugin('en')?.label).toBe('English')
      expect(getLocalePlugin('zh-CN')?.label).toBe('简体中文')
      expect(getLocalePlugin('zh-TW')?.label).toBe('繁體中文')
    })
  })

  describe('resolveBrowserLocale', () => {
    it('returns en for empty / unknown', () => {
      expect(resolveBrowserLocale([])).toBe('en')
      expect(resolveBrowserLocale(['fr-FR'])).toBe('en')
    })

    it('matches exact and prefix', () => {
      expect(resolveBrowserLocale(['en-US'])).toBe('en')
      expect(resolveBrowserLocale(['zh-CN'])).toBe('zh-CN')
      expect(resolveBrowserLocale(['zh-Hans'])).toBe('zh-CN')
      expect(resolveBrowserLocale(['zh-TW'])).toBe('zh-TW')
      expect(resolveBrowserLocale(['zh-HK'])).toBe('zh-TW')
    })

    it('first match in priority list wins', () => {
      expect(resolveBrowserLocale(['zh-TW', 'en-US'])).toBe('zh-TW')
      expect(resolveBrowserLocale(['en-US', 'zh-TW'])).toBe('en')
    })
  })
})
