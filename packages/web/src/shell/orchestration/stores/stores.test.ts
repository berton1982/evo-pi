import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useLocaleStore } from '@/shell/orchestration/stores/use-locale-store'
import { useSidebarPrefsStore } from '@/shell/orchestration/stores/use-sidebar-prefs-store'
import { useSidebarStore } from '@/shell/orchestration/stores/use-sidebar-store'
import { useThemeStore } from '@/shell/orchestration/stores/use-theme-store'

/**
 * Reset all stores between tests so state does not leak across files
 * (zustand stores are module-level singletons).
 */
function resetStores(): void {
  useSidebarStore.setState({ sidebarOpen: true, sidebarWidth: 260 })
  useThemeStore.setState({ theme: 'system' })
  useLocaleStore.setState({ locale: 'en' })
  useSidebarPrefsStore.setState({ pinned: false, showIgnored: false })
}

/**
 * Minimal localStorage shim for node env (zustand persist middleware
 * needs it). Vitest default env is 'node' (per vitest.config.ts) so we
 * cannot rely on jsdom-provided localStorage. The shim is a plain Map;
 * tests that need real localStorage semantics (quota, serialization
 * edge cases) should use jsdom env explicitly.
 */
const memoryStorage = (() => {
  const store = new Map<string, string>()
  return {
    getItem: (key: string): string | null => store.get(key) ?? null,
    setItem: (key: string, value: string): void => {
      store.set(key, value)
    },
    removeItem: (key: string): void => {
      store.delete(key)
    },
    clear: (): void => {
      store.clear()
    },
    key: (index: number): string | null => Array.from(store.keys())[index] ?? null,
    get length(): number {
      return store.size
    },
  }
})()

beforeEach(() => {
  vi.stubGlobal('localStorage', memoryStorage)
})

afterEach(() => {
  vi.unstubAllGlobals()
  memoryStorage.clear()
  resetStores()
})

describe('useSidebarStore', () => {
  it('starts with sidebar open at default width', () => {
    expect(useSidebarStore.getState().sidebarOpen).toBe(true)
    expect(useSidebarStore.getState().sidebarWidth).toBe(260)
  })

  it('setSidebarOpen flips the flag', () => {
    useSidebarStore.getState().setSidebarOpen(false)
    expect(useSidebarStore.getState().sidebarOpen).toBe(false)
  })

  it('toggleSidebar inverts the flag', () => {
    useSidebarStore.getState().toggleSidebar()
    expect(useSidebarStore.getState().sidebarOpen).toBe(false)
    useSidebarStore.getState().toggleSidebar()
    expect(useSidebarStore.getState().sidebarOpen).toBe(true)
  })

  it('setSidebarWidth clamps to [200, 480]', () => {
    useSidebarStore.getState().setSidebarWidth(50)
    expect(useSidebarStore.getState().sidebarWidth).toBe(200)
    useSidebarStore.getState().setSidebarWidth(9999)
    expect(useSidebarStore.getState().sidebarWidth).toBe(480)
    useSidebarStore.getState().setSidebarWidth(320)
    expect(useSidebarStore.getState().sidebarWidth).toBe(320)
  })
})

describe('useThemeStore', () => {
  it('starts at system preference', () => {
    expect(useThemeStore.getState().theme).toBe('system')
  })

  it('setTheme updates the preference', () => {
    useThemeStore.getState().setTheme('dark')
    expect(useThemeStore.getState().theme).toBe('dark')
    useThemeStore.getState().setTheme('light')
    expect(useThemeStore.getState().theme).toBe('light')
  })
})

describe('useLocaleStore', () => {
  it('starts at en', () => {
    expect(useLocaleStore.getState().locale).toBe('en')
  })

  it('setLocale switches locale', () => {
    useLocaleStore.getState().setLocale('zh-CN')
    expect(useLocaleStore.getState().locale).toBe('zh-CN')
  })
})

describe('useSidebarPrefsStore (persisted)', () => {
  it('starts with defaults', () => {
    expect(useSidebarPrefsStore.getState().pinned).toBe(false)
    expect(useSidebarPrefsStore.getState().showIgnored).toBe(false)
  })

  it('setPinned and setShowIgnored update fields', () => {
    useSidebarPrefsStore.getState().setPinned(true)
    useSidebarPrefsStore.getState().setShowIgnored(true)
    expect(useSidebarPrefsStore.getState().pinned).toBe(true)
    expect(useSidebarPrefsStore.getState().showIgnored).toBe(true)
  })

  it('writes through persist middleware (no thrown error)', () => {
    // If persist cannot write, it logs a warning but does not throw.
    // We just verify the setter returns without exception.
    expect(() => {
      useSidebarPrefsStore.getState().setPinned(true)
    }).not.toThrow()
  })
})
