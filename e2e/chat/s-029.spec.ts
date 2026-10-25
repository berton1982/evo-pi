import { expect, test } from '@playwright/test'

/** B-029 工具调用时长：超过最小阈值才显示，优先用结果里的记录值
 */
test('T-029 工具时长超过 1s 才显示，值与结果里记录的一致', async ({ page }) => {
  await page.goto('/sessions?session=01jclongsession0000000000001&cwd=/home/berton/evo-pi')
  // 工具块在"过程"区里：过程默认折叠，先展开再看时长
  const toggles = page.getByTestId('chat-process-toggle')
  if (await toggles.count()) await toggles.last().click()
  const call = page.getByTestId('chat-tool-call').filter({ hasText: 'apply_patch' }).first()
  await expect(call.getByTestId('chat-tool-duration')).toHaveText('1.5s')
  // 低于阈值的调用不显示时长（夹具里 bash 那条没有 durationMs）
  const junk = page.getByTestId('chat-tool-call').filter({ hasText: 'bash' }).first()
  await junk.scrollIntoViewIfNeeded()
  await expect(junk.getByTestId('chat-tool-duration')).toHaveCount(0)
})
