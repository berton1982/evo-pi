// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

/**
 * jsdom polyfills for libraries that need browser-only APIs.
 *
 * next-themes calls window.matchMedia for the system color-scheme detection.
 * react-resizable-panels uses ResizeObserver. jsdom provides neither by
 * default; stub passive no-op implementations.
 *
 * Note: ResizeObserver MUST be a real class (not vi.fn) because the lib
 * does `new ResizeObserver(cb)`. vi.fn returns a callable mock that throws
 * "not a constructor" when used with `new`.
 */

if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // deprecated API; kept for next-themes compat
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

class NoopResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

if (typeof window !== 'undefined' && !('ResizeObserver' in window)) {
  Object.defineProperty(window, 'ResizeObserver', {
    writable: true,
    value: NoopResizeObserver,
  })
}

class NoopIntersectionObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return []
  }
  root = null
  rootMargin = ''
  thresholds = []
}

if (typeof window !== 'undefined' && !('IntersectionObserver' in window)) {
  Object.defineProperty(window, 'IntersectionObserver', {
    writable: true,
    value: NoopIntersectionObserver,
  })
}
