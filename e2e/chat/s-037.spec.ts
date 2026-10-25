import { expect, test } from '@playwright/test'

/** B-037 相邻消息时间戳去重：与上一条同分钟时不再显示 */
test('T-037 同一分钟内的相邻消息只显示一次时间', async ({ page }) => {
  await page.goto('/sessions?session=01jclongsession0000000000001&cwd=/home/berton/evo-pi')
  const stamps = page.getByTestId('chat-timestamp')
  await expect(stamps.first()).toBeVisible()
  // 夹具里第 3、4 条同分钟：时间戳数量必须严格少于消息数量
  const messageCount = await page.getByTestId(/chat-message-(user|assistant)/).count()
  const stampCount = await stamps.count()
  expect(stampCount).toBeLessThan(messageCount)
  // 且不能出现两条相邻且完全相同的时间戳
  const texts = await stamps.allInnerTexts()
  const adjacentDup = texts.some((text, index) => index > 0 && texts[index - 1] === text)
  expect(adjacentDup).toBe(false)
})
