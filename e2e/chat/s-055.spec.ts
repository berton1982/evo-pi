import { expect, test } from '@playwright/test'

/** B-055 主区顶栏右侧是「会话信息」按钮，点击弹出面板展示当前会话详情（模型/统计/路径） */
test('T-055 点「会话信息」打开面板，再点关闭', async ({ page }) => {
  await page.goto('/sessions')
  await expect(page.getByTestId('chat-surface')).toBeVisible()
  await page.getByTestId('chat-session-info').click()
  await expect(page.getByTestId('chat-session-info-panel')).toBeVisible()
  await page.getByRole('button', { name: /关闭/ }).click()
  await expect(page.getByTestId('chat-session-info-panel')).toHaveCount(0)
})
