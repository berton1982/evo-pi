import { expect, test } from '@playwright/test'

/** B-015 完成提示音：仅在未中断且开关打开时播放（开关持久化） */
test('T-015 提示音开关可切换并跨刷新保持', async ({ page }) => {
  await page.goto('/sessions?session=01jclongsession0000000000001&cwd=/home/berton/evo-pi')
  await page.getByTestId('chat-more').click()
  const sound = page.getByTestId('chat-sound')
  await expect(sound).toHaveAttribute('aria-pressed', 'false')
  await sound.click()
  await expect(sound).toHaveAttribute('aria-pressed', 'true')
  await expect(sound).toContainText('开')
  await page.reload()
  await page.getByTestId('chat-more').click()
  await expect(page.getByTestId('chat-sound')).toHaveAttribute('aria-pressed', 'true')
})
