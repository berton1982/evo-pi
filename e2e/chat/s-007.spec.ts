import { expect, test } from '@playwright/test'

/** B-007 */
test('T-007 取最后一条含回答的助手消息，跳过工具结果', async ({ page }) => {
  await page.goto('/sessions?session=01jcchatfixture0000000000001')
  await expect(page.getByTestId('chat-message-assistant')).toContainText('已经按 user/project 分组')
  await expect(page.getByTestId('chat-message-assistant')).not.toContainText('mcp-panel.tsx')
})
