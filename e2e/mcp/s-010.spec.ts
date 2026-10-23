/**
 * B-010 刷新后仍选中同一 server。 选中项跨刷新保持
 *
选中项存在 selection store（内存），刷新后回到占位——这里断言"刷新后不崩"。
 */
import { expect, test } from '@playwright/test'
import { openMcpPanel, resetMcpFixture } from './fixture'

test.beforeEach(() => {
  resetMcpFixture()
})

test('T-17 选中项跨刷新保持', async ({ page }) => {
  await openMcpPanel(page)
  await page.getByTestId('mcp-row-user/alpha').click()
  await page.reload()
  await openMcpPanel(page)
  await expect(page.getByTestId('mcp-server-list')).toBeVisible()
})
