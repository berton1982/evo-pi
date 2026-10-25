import { expect, test } from '@playwright/test'

/** B-042 无消息时显示空态引导 */
test('T-042 空会话显示空态引导而不是空白', async ({ page }) => {
  await page.goto('/sessions?session=01jcemptysession0000000000001')
  await expect(page.getByTestId('chat-empty')).toBeVisible()
  await expect(page.getByTestId('chat-user-bubble')).toHaveCount(0)
})
