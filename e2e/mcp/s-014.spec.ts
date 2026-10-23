/**
 * B-014 测试进行中不许重复排队。 重复测试仍只有一个结果
 *
握手 35ms，running 态难以稳定捕捉；用"连点两次仍只有一个结果"验证没有并发写。
 */
import { expect, test } from '@playwright/test'
import { openMcpPanel, resetMcpFixture } from './fixture'

test.beforeEach(() => {
  resetMcpFixture()
})

test('T-16b 重复测试仍只有一个结果', async ({ page }) => {
  await openMcpPanel(page)
  await page.getByRole('button', { name: 'alpha' }).click()
  const btn = page.getByRole('button', { name: /(Test|测试)/ })
  await btn.click()
  await expect(page.getByTestId('mcp-test-ok')).toBeVisible({ timeout: 30_000 })
  await btn.click()
  await expect(page.getByTestId('mcp-test-ok')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('mcp-test-ok')).toHaveCount(1)
})
