import { expect, test } from '@playwright/test'

/** B-041 消息 key 稳定：用 entryId + blockIndex 作锚点，渲染层不自造 key */
test('T-041 每条消息带稳定锚点，且相邻不重复', async ({ page }) => {
  await page.goto('/sessions?session=01jclongsession0000000000001&cwd=/home/berton/evo-pi')
  // 先等历史消息加载完：不等就 evaluateAll，拿到的是还在 loading 的空列表
  await page.getByTestId('chat-message-assistant').first().waitFor({ timeout: 15000 })
  const keys = await page
    .locator('[data-testid="chat-message-assistant"][data-key]')
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-key')))
  expect(keys.length).toBeGreaterThan(10)
  // 形如 <entryId>-<index>，且全表唯一（自造 key 会在流式合流时撞车）
  for (const key of keys) expect(key).toMatch(/^[A-Za-z0-9-]+-\d+$/)
  expect(new Set(keys).size).toBe(keys.length)
})
