/**
 * B-009 未选中态。 未选中时显示占位文案
 *
占位文案本身是可断言的行为（pi-web 里它被埋在 JSX 里，没有测试）。
 */
import { expect, test } from '@playwright/test'
import { openMcpPanel, resetMcpFixture } from './fixture'

test.beforeEach(() => {
  resetMcpFixture()
})

test('T-23 未选中时显示占位文案', async ({ page }) => {
  await openMcpPanel(page)
  await expect(page.getByTestId('mcp-detail-placeholder')).toBeVisible()
})
