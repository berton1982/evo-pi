import { expect, test } from '@playwright/test'

/** B-036 助手消息时间戳：只在有值且是最终回答时显示 */
test('T-036 消息显示到分钟的时间戳', async ({ page }) => {
  await page.goto('/sessions?session=01jclongsession0000000000001&cwd=/home/berton/evo-pi')
  const stamps = page.getByTestId('chat-timestamp')
  await expect(stamps.first()).toBeVisible()
  // 只到分钟：形如 08:03，不带秒
  await expect(stamps.first()).toHaveText(/^\d{2}:\d{2}$/)
})
