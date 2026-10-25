import { expect, test } from '@playwright/test'

/** B-032 patch 文本在无法解析为文件时降级为纯文本视图
 */
test('T-032 非 patch 的工具输出降级为纯文本，不丢内容', async ({ page }) => {
  await page.goto('/sessions?session=01jclongsession0000000000001&cwd=/home/berton/evo-pi')
  const call = page.getByTestId('chat-tool-call').filter({ hasText: 'bash' }).first()
  await call.getByRole('button').first().click()
  // 降级：原文照旧可见
  await expect(page.getByTestId('chat-tool-result').last()).toContainText(
    'fatal: not a git repository',
  )
  // 且不该出现"并排 diff"（它只属于能解析成文件的 patch）
  await expect(call.getByTestId('chat-split-diff')).toHaveCount(0)
})
