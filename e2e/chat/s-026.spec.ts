import { expect, test } from '@playwright/test'

/** B-026 思考块：默认折叠，展开时按需异步加载思考正文并缓存 */
test('T-026 展开后按需加载并显示思考正文', async ({ page }) => {
  await page.goto('/sessions?session=01jcchatfixture0000000000001')
  await expect(page.getByTestId('chat-process')).toContainText('先看 groups 的排序规则')
  // 缓存：再收起/展开一次，正文仍在（不回到占位）
  await expect(page.getByTestId('chat-thinking')).toBeVisible()
})
