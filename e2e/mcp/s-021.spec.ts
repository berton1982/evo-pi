/**
 * B-021 批量后组头跟着变。 组头计数即时更新
 *
计数是派生值，不需要额外写状态。
 */
import { expect, test } from '@playwright/test'
import { openMcpPanel, resetMcpFixture } from './fixture'

test.beforeEach(() => {
  resetMcpFixture()
})

test('T-14b 组头计数即时更新', async ({ page }) => {
  await openMcpPanel(page)
  await expect(page.getByTestId('mcp-group-status-user')).toContainText('/2')
  // 组头是 role=switch，不是普通按钮
  await page.getByTestId('mcp-group-user').getByRole('switch').first().click()
  await expect
    .poll(
      async () =>
        (await page.getByTestId('mcp-group-status-user').innerText()).includes('0/2') ||
        (await page.getByTestId('mcp-group-status-user').innerText()).includes('2/2'),
      { timeout: 20_000 },
    )
    .toBe(true)
})
