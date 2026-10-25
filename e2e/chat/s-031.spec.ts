import { expect, test } from '@playwright/test'

/** B-031 diff 渲染：apply_patch 结果按文件视角展示左右两栏 */
test('T-031 apply_patch 结果渲染成两栏 diff', async ({ page }) => {
  await page.goto('/sessions?session=01jclongsession0000000000001&cwd=/home/berton/evo-pi')
  const diff = page.getByTestId('chat-split-diff')
  await expect(diff).toBeVisible()
  await expect(diff).toContainText('block-view.tsx')
  // 两栏：同一行里既有删除也有新增（table-fixed 两列）
  await expect(diff.locator('td').first()).toBeVisible()
  await expect(diff).toContainText('ToolCallBlock')
})
