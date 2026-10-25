import { expect, test } from '@playwright/test'

/** B-031 diff 渲染：apply_patch 结果按文件视角展示左右两栏
 * 夹具尾部内容契约尚未固化：这些断言依赖长会话夹具里"富文本/工具块/错误消息"的精确位置，
 * 而该夹具是可重建的生成物（`e2e/fixtures/ensure-long-session.mjs`）。下一步先把断言
 * 需要的内容写进生成器（或反过来按生成器调整断言），再解除 fixme——
 * 在两者对齐之前保持 fixme，避免"看起来在测、其实测的是夹具布局"。
 */
test.fixme('T-031 apply_patch 结果渲染成两栏 diff', async ({ page }) => {
  await page.goto('/sessions?session=01jclongsession0000000000001&cwd=/home/berton/evo-pi')
  const diff = page.getByTestId('chat-split-diff')
  await expect(diff).toBeVisible()
  await expect(diff).toContainText('block-view.tsx')
  // 两栏：同一行里既有删除也有新增（table-fixed 两列）
  await expect(diff.locator('td').first()).toBeVisible()
  await expect(diff).toContainText('ToolCallBlock')
})
