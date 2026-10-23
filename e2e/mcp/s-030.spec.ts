/**
 * B-030 测试态三选一。 测试三态文案互斥
 *
running / ok / fail 同一时刻最多一个。
 */
import { expect, test } from '@playwright/test'
import { openMcpPanel, resetMcpFixture } from './fixture'

test.beforeEach(() => {
  resetMcpFixture()
})

test('T-16 测试三态文案互斥', async ({ page }) => {
  await openMcpPanel(page)
  await page.getByRole('button', { name: 'alpha' }).click()
  await page.getByRole('button', { name: /(Test|测试)/ }).click()
  await expect(page.getByTestId('mcp-test-ok')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('mcp-test-running')).toHaveCount(0)
  const ok = await page.getByTestId('mcp-test-ok').count()
  const fail = await page.getByTestId('mcp-test-fail').count()
  expect(ok + fail).toBe(1)
})
