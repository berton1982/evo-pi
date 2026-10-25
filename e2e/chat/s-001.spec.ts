import { expect, test } from '@playwright/test'

/** B-001 */
test('T-001 加载完成后显示消息列表（骨架消失）', async ({ page }) => {
  await page.goto('/sessions?session=01jclongsession0000000000001&cwd=/home/berton/evo-pi')
  await expect(page.getByTestId('chat-message-user').first()).toBeVisible()
  await expect(page.getByTestId('chat-loading')).toHaveCount(0)
})
