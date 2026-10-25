import { expect, test } from '@playwright/test'

/**
 * B-004 在底部时新消息到达仍贴底。
 
*/
test('T-004 贴尾时发消息，回复到达后仍贴底', async ({ page }) => {
  await page.addInitScript(() => {
    window.sessionStorage.clear()
    window.localStorage.clear()
  })
  await page.goto('/sessions?session=01jclongsession0000000000001&cwd=/home/berton/evo-pi')
  const list = page.getByTestId('chat-scroll')
  const fromTail = () => list.evaluate((el) => el.scrollHeight - el.scrollTop - el.clientHeight)

  await expect.poll(fromTail, { timeout: 5000 }).toBeLessThanOrEqual(24)

  await page.getByTestId('chat-input').fill('贴底跟随检查')
  await page.getByTestId('chat-send').click()
  // 只等回复：桩的回复文本是固定的（不回声输入），所以断言"回声"会永远红——
  // 这条用例要验的是"新内容到达后仍贴底"，不是回复内容。
  await expect(page.getByText('这是假传输的回复', { exact: false })).toBeVisible({
    timeout: 15_000,
  })

  await expect.poll(fromTail, { timeout: 5000 }).toBeLessThanOrEqual(24)
})
