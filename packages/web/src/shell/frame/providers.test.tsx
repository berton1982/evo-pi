// @vitest-environment jsdom
// (jsdom env + global setupFiles: ./packages/web/src/test-setup.ts polyfills matchMedia)
import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProviders } from '@/shell/frame/providers'
import { useLocaleStore } from '@/shell/orchestration/stores'

/**
 * Memory localStorage shim (node env has none; jsdom-based @testing-library
 * normally provides it but we keep tests hermetic).
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
  memoryStorage.clear()
  useLocaleStore.setState({ locale: 'en' })
})

afterEach(() => {
  vi.unstubAllGlobals()
  memoryStorage.clear()
})

describe('AppProviders', () => {
  it('renders children inside the provider tree', () => {
    render(
      <AppProviders>
        <div data-testid="child">hello</div>
      </AppProviders>,
    )
    expect(screen.getByTestId('child')).toHaveTextContent('hello')
  })

  it('renders multiple children', () => {
    render(
      <AppProviders>
        <span data-testid="a">a</span>
        <span data-testid="b">b</span>
      </AppProviders>,
    )
    expect(screen.getByTestId('a')).toBeInTheDocument()
    expect(screen.getByTestId('b')).toBeInTheDocument()
  })

  it('does not crash when no children provided', () => {
    // ReactNode | undefined
    expect(() => render(<AppProviders>{undefined}</AppProviders>)).not.toThrow()
  })
})
