import { expect, test } from '@playwright/test'

/** B-033 用户消息气泡最大高度受限，超出可展开查看全文 */
test('T-033 超长用户消息先折叠，展开后可看到全文', async ({ page }) => {
  await page.goto('/sessions?session=01jclongsession0000000000001&cwd=/home/berton/evo-pi')
  // 只有第 30 条是超长的：不能用 .first()，那取到的是第一条短消息
  const bubble = page.getByTestId('chat-user-bubble').filter({ hasText: '超长提问' }).first()
  const expand = bubble.locator('xpath=following::*[@data-testid="chat-user-expand"][1]')
  await expect(bubble).toBeVisible({ timeout: 15000 })
  await expect(expand).toBeVisible()
  const folded = await bubble.evaluate((node) => node.getBoundingClientRect().height)
  expect(folded).toBeLessThanOrEqual(240) // 折叠态被限高
  await expect(expand).toHaveAttribute('aria-expanded', 'false')
  await expand.click()
  await expect(expand).toHaveAttribute('aria-expanded', 'true')
  const unfolded = await bubble.evaluate((node) => node.getBoundingClientRect().height)
  expect(unfolded).toBeGreaterThan(folded)
})
