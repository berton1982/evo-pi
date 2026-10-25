import { expect, test } from '@playwright/test'

/** B-027 思考块加载中显示占位：取到正文后占位消失（否则用户会一直看到"思考中"） */
test('T-027 思考正文取到后占位文案消失', async ({ page }) => {
  await page.goto('/sessions?session=01jcchatfixture0000000000001')
  await expect(page.getByTestId('chat-thinking')).toBeVisible()
  await expect(page.getByTestId('chat-thinking-loading')).toHaveCount(0)
})
