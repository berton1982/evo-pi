import { expect, test } from '@playwright/test'

test('UI → /api/agent → SSE 回复', async ({ page }) => {
  await page.goto('/sessions?session=01jclongsession0000000000001')
  await page.getByTestId('chat-input').fill('一致性检查')
  await page.getByTestId('chat-send').click()
  await expect(page.getByText('收到：', { exact: false })).toBeVisible({ timeout: 15000 })
})
