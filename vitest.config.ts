import { resolve } from 'node:path'

import { defineConfig } from 'vitest/config'

/**
 * Workspace-root vitest config.
 *
 * Single-root strategy (not vitest workspaces mode): one config covers all
 * packages via `include` glob, no per-package vitest.config.ts needed.
 *
 * Why not vitest workspaces: P0 is monorepo scaffolding with placeholder
 * packages — vitest workspaces requires each subproject to have its own
 * vitest.config.ts. Simpler root config wins until P5+ where multiple
 * packages might want different test environments (node vs jsdom).
 */
export default defineConfig({
  oxc: {
    // vite 8 ships oxc-transform as the default JS transformer (faster
    // than esbuild). For JSX we need 'automatic' so JSX is emitted as
    // runtime calls; the 'preserve' default (from tsconfig) keeps JSX
    // intact and breaks @testing-library/react render.
    jsx: 'automatic',
  },
  resolve: {
    alias: {
      // Mirror packages/web/tsconfig.json paths so tests can use '@/'
      // aliases that the source code uses.
      '@': resolve(import.meta.dirname, 'packages/web/src'),
    },
  },
  test: {
    name: 'evo-pi-monorepo',
    include: [
      'packages/**/*.test.ts',
      'packages/**/*.test.tsx',
      'pi-packages/**/*.test.ts',
      'pi-packages/**/*.test.tsx',
    ],
    exclude: ['node_modules/**', '**/node_modules/**', 'dist/**', 'coverage/**', '**/.turbo/**'],
    environment: 'node',
    setupFiles: ['./packages/web/src/test-setup.ts'],
    globals: false, // explicit imports — keeps TS strict + IDE happy
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: './coverage',
      include: ['packages/**/src/**/*.ts', 'pi-packages/**/src/**/*.ts'],
      exclude: ['packages/**/*.test.ts', 'pi-packages/**/*.test.ts'],
    },
  },
})
