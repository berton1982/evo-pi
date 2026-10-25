import { expect, test } from '@playwright/test'

/** B-043 */
test('T-043 长内容换行，不产生横向滚动条', async ({ page }) => {
  await page.goto('/sessions?session=01jclongsession0000000000001&cwd=/home/berton/evo-pi')
  const overflow = await page.getByTestId('chat-scroll').evaluate((el) => {
    const node = el as HTMLElement
    return node.scrollWidth - node.clientWidth
  })
  expect(overflow).toBeLessThanOrEqual(1)
})
