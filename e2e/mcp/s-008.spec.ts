/**
 * B-008 点行 → 详情面板接管。 选中后右侧显示详情
 *
行是按钮（可键盘聚焦），点击后详情接管右栏。
 */
import { expect, test } from '@playwright/test'
import { openMcpPanel, resetMcpFixture } from './fixture'

test.beforeEach(() => {
  resetMcpFixture()
})

test('T-15 选中后右侧显示详情', async ({ page }) => {
  await openMcpPanel(page)
  await page.getByRole('button', { name: 'alpha' }).click()
  await expect(page.getByTestId('mcp-detail')).toBeVisible()
  await expect(page.getByTestId('mcp-detail-name')).toHaveText('alpha')
  await expect(page.getByTestId('mcp-detail-placeholder')).toHaveCount(0)
})
