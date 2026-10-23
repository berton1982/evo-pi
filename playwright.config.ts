import { defineConfig, devices } from '@playwright/test'

/**
 * Workspace-root Playwright config.
 *
 * P0 status: no web app exists yet (pi-web 推迟到 P1)。
 * This config lays the pipeline foundation so P1+ can drop real e2e
 * specs in `e2e/` directories and have them picked up automatically.
 *
 * Decisions:
 * - testDir set to ./e2e (sibling of packages/); per-package e2e/ dirs
 *   are picked up via workspace glob (vitest-style discovery)
 * - chromium only (Firefox/WebKit deferred until P5+ may need them)
 * - baseURL placeholder; overridden via PLAYWRIGHT_BASE_URL env when real
 *   web app is available
 * - webServer commented out (no `pnpm dev` target yet)
 * - reporters: list (local dev) + html (CI artifact)
 * - browsers NOT installed by default in P0; run
 *   `pnpm exec playwright install chromium` when first real e2e is needed
 *
 * Verification without browser install:
 *   pnpm exec playwright test --list
 * Should output spec count (1 in P0: smoke.spec.ts) WITHOUT needing
 * chromium binaries on disk.
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: /.*\.spec\.ts$/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:30041',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Use system Chrome instead of bundled chromium-headless-shell
    // (per MEMORY §6.6 fallback — avoids ~150MB browser download).
    // Override via PLAYWRIGHT_CHROMIUM_PATH env if Chrome lives elsewhere.
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH ?? '/usr/bin/google-chrome',
      args: ['--no-sandbox'],
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // webServer placeholder (commented out for P0):
  // webServer: {
  //   command: 'pnpm dev',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
})
