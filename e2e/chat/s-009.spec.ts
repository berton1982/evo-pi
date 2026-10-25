import { expect, test } from '@playwright/test'

/** B-009 发送消息：把输入草稿交给 agent，成功后清空草稿并贴底 */
test('T-009 发送后清空草稿并出现助手流式回复', async ({ page }) => {
  await page.goto('/sessions?session=01jcchatfixture0000000000001')
  await page.getByTestId('chat-input').fill('你好')
  await page.getByTestId('chat-send').click()
  await expect(page.getByTestId('chat-input')).toHaveValue('')
  // 流式回复由假传输按块推回；断言正文而不是具体消息节点，避免多条 assistant 时的定位抖动
  await expect(page.getByText('这是假传输的回复')).toBeVisible({ timeout: 20000 })
})
