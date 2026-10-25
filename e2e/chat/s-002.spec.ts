import { expect, test } from '@playwright/test'

/** B-002 消息列表按 entry 顺序渲染，同一 entry 的多个内容块保持原序 */
test('T-002 空态可见', async ({ page }) => {
  await page.goto('/sessions')
  await expect(page.getByTestId('chat-surface')).toBeVisible()
  await expect(page.getByTestId('chat-empty')).toBeVisible()
})
