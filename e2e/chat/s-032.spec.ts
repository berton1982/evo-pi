import { expect, test } from '@playwright/test'

/** B-032 patch 文本在无法解析为文件时降级为纯文本视图
 * 夹具尾部内容契约尚未固化：这些断言依赖长会话夹具里"富文本/工具块/错误消息"的精确位置，
 * 而该夹具是可重建的生成物（`e2e/fixtures/ensure-long-session.mjs`）。下一步先把断言
 * 需要的内容写进生成器（或反过来按生成器调整断言），再解除 fixme——
 * 在两者对齐之前保持 fixme，避免"看起来在测、其实测的是夹具布局"。
 */
test.fixme('T-032 非 patch 的工具输出降级为纯文本，不丢内容', async ({ page }) => {
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
