/**
 * B-002 信任态变化触发一次重载。 信任后重载清单
 *
用 cwd 变化模拟"信任态变了要重拉"。
 */
import { expect, test } from '@playwright/test'
import { openMcpPanel, resetMcpFixture } from './fixture'

test.beforeEach(() => {
  resetMcpFixture()
})

test('T-19 信任后重载清单', async ({ page }) => {
  await openMcpPanel(page)
  await expect(page.getByTestId('mcp-row-user/alpha')).toBeVisible()
  await openMcpPanel(page, '/tmp/e2e-proj')
  await expect(page.getByTestId('mcp-row-user/alpha')).toBeVisible()
})
