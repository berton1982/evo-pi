/**
 * B-015 只更新被测那一行。 结果按 key 回填到对应行
 *
测 alpha 后切到 beta：结果不该串到 beta。
 */
import { expect, test } from '@playwright/test'
import { openMcpPanel, resetMcpFixture } from './fixture'

test.beforeEach(() => {
  resetMcpFixture()
})

test('T-16c 结果按 key 回填到对应行', async ({ page }) => {
  await openMcpPanel(page)
  await page.getByRole('button', { name: 'alpha' }).click()
  await page.getByRole('button', { name: /(Test|测试)/ }).click()
  await expect(page.getByTestId('mcp-test-ok')).toBeVisible({ timeout: 30_000 })
  await page.getByRole('button', { name: 'beta' }).click()
  await expect(page.getByTestId('mcp-test-ok')).toHaveCount(0)
})
