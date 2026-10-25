import { expect, test } from '@playwright/test'

/** B-050 */
test('T-050 运行中发送按钮让位给引导/追加', async ({ page }) => {
  await page.goto('/sessions?session=01jcchatfixture0000000000001&cwd=/home/berton/evo-pi/packages/web')
  await page.getByTestId('chat-input').fill('第一句')
  await page.getByTestId('chat-send').click()
  await expect(page.getByTestId('chat-steer')).toBeVisible()
  await expect(page.getByTestId('chat-follow-up')).toBeVisible()
})
