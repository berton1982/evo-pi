/**
 * B-007 组头计数由该组 server 现算。 组头显示 启用/总数
 *
计数是派生值，不单独存。
 */
import { expect, test } from '@playwright/test'
import { openMcpPanel, resetMcpFixture } from './fixture'

test.beforeEach(() => {
  resetMcpFixture()
})

test('T-09 组头显示 启用/总数', async ({ page }) => {
  await openMcpPanel(page)
  await expect(page.getByTestId('mcp-group-status-user')).toHaveText(/2\/2/)
  await expect(page.getByTestId('mcp-group-status-project')).toHaveText(/1\/1/)
})
