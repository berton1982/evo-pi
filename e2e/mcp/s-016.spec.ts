/**
 * B-016 空态不是空白页。 空态文案可读
 *
无 server 的目录用 /tmp/definitely-missing 模拟（user 级仍有）。
 */
import { expect, test } from '@playwright/test'
import { openMcpPanel, resetMcpFixture } from './fixture'

test.beforeEach(() => {
  resetMcpFixture()
})

test('T-22b 空态文案可读', async ({ page }) => {
  await openMcpPanel(page)
  await openMcpPanel(page, '/tmp/definitely-missing')
  await expect(page.getByTestId('mcp-phase-title')).toHaveCount(0)
  await expect(page.getByTestId('mcp-server-list')).toBeVisible()
})
