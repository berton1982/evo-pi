import { expect, test } from '@playwright/test'

/** B-051 次要控件收进「更多控件」面板（模型/推理级别/工具预设/压缩/声音/输入历史），可折叠 */
test('T-051 点「更多控件」后面板展开，再点收起', async ({ page }) => {
  await page.goto('/sessions')
  await expect(page.getByTestId('chat-surface')).toBeVisible()
  await page.getByTestId('chat-more').click()
  await expect(page.getByTestId('chat-more-panel')).toBeVisible()
  await page.getByTestId('chat-more').click()
  await expect(page.getByTestId('chat-more-panel')).toHaveCount(0)
})
