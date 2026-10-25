import { expect, test } from '@playwright/test'

/**
 * B-004 在底部时新消息到达仍贴底。
 
 * 夹具尾部内容契约尚未固化：这些断言依赖长会话夹具里"富文本/工具块/错误消息"的精确位置，
 * 而该夹具是可重建的生成物（`e2e/fixtures/ensure-long-session.mjs`）。下一步先把断言
 * 需要的内容写进生成器（或反过来按生成器调整断言），再解除 fixme——
 * 在两者对齐之前保持 fixme，避免"看起来在测、其实测的是夹具布局"。
*/
test.fixme('T-004 贴尾时发消息，回复到达后仍贴底', async ({ page }) => {
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
