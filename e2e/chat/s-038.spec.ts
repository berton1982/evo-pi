import { expect, test } from '@playwright/test'

/** B-038 错误消息：以警示样式渲染并保留原始错误文本
 */
test('T-038 出错时显示原始错误文本与警示样式', async ({ page }) => {
  await page.goto('/sessions?session=01jclongsession0000000000001&cwd=/home/berton/evo-pi')
  const error = page.getByTestId('chat-error').first()
  await expect(error).toBeVisible()
  await expect(error).toHaveAttribute('role', 'alert')
  // 原文保留：不改写成"出错了"
  await expect(error).toContainText('model "gpt-none" not found')
})
