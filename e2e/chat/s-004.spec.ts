import { expect, test } from '@playwright/test'

/**
 * B-004 在底部时新消息到达仍贴底。
 *
 * 判据：贴尾状态下发送一条消息，等到助手回复出现后，距离底部仍 ≤24px
 * （`chat-scroll.ts` 的 CHAT_SCROLL_TAIL_TOLERANCE）。
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
  // 用户消息立刻出现，随后助手回复经 /api/agent 的 SSE 到达
  await expect(page.getByText('贴底跟随检查')).toBeVisible()
  await expect(page.getByText('这是假传输的回复。', { exact: false })).toBeVisible({
    timeout: 10_000,
  })

  await expect.poll(fromTail, { timeout: 5000 }).toBeLessThanOrEqual(24)
})
