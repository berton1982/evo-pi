import { expect, test } from '@playwright/test'

/** B-028 工具调用块：显示工具名、参数摘要与状态（运行中/成功/失败） */
test('T-028 工具块显示名称与参数，可展开查看入参', async ({ page }) => {
  await page.goto('/sessions?session=01jclongsession0000000000001&cwd=/home/berton/evo-pi')
  const block = page.getByTestId('chat-tool-call').first()
  await expect(block).toBeVisible()
  await expect(block).toContainText('apply_patch')
  // 入参默认收起；展开后才出现 JSON
  await expect(page.getByTestId('chat-tool-input')).toHaveCount(0)
  await block.getByRole('button').first().click()
  await expect(page.getByTestId('chat-tool-input').first()).toContainText('patch')
})
