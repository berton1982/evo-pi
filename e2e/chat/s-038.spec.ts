import { expect, test } from '@playwright/test'

/** B-038 错误消息：以警示样式渲染并保留原始错误文本
 * 夹具尾部内容契约尚未固化：这些断言依赖长会话夹具里"富文本/工具块/错误消息"的精确位置，
 * 而该夹具是可重建的生成物（`e2e/fixtures/ensure-long-session.mjs`）。下一步先把断言
 * 需要的内容写进生成器（或反过来按生成器调整断言），再解除 fixme——
 * 在两者对齐之前保持 fixme，避免"看起来在测、其实测的是夹具布局"。
 */
test.fixme('T-038 出错时显示原始错误文本与警示样式', async ({ page }) => {
  await page.goto('/sessions?session=01jclongsession0000000000001&cwd=/home/berton/evo-pi')
  const error = page.getByTestId('chat-error').first()
  await expect(error).toBeVisible()
  await expect(error).toHaveAttribute('role', 'alert')
  // 原文保留：不改写成"出错了"
  await expect(error).toContainText('model "gpt-none" not found')
})
