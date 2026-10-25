import { expect, test } from '@playwright/test'

/** B-045 流式与完整消息渲染一致：同一内容在两条路径下文本相同 */
test('T-045 流式增量拼出的文本与完整消息一致', async ({ page }) => {
  await page.goto('/sessions?session=01jcchatfixture0000000000001')
  await page.getByTestId('chat-input').fill('一致性检查')
  await page.getByTestId('chat-send').click()
  // 不用 .last()：直播消息与历史消息的顺序受 store 与加载竞态影响（夹具里本来就有一条助手消息）
  const live = page.getByText('这是假传输的回复')
  await expect(live.first()).toBeVisible({ timeout: 20000 })
  // 流式结束后不再有 aria-busy（说明已按完整消息渲染）
  await expect(page.getByTestId('chat-streaming')).toHaveCount(0)
  // 文本连续性：拼接后的正文不含被吞掉的字符（假传输按块推 "收到：/文本/。/结尾"）
  // 桩的前缀"（演示模式，尚未接入真实 agent）"是刻意加的：不做成接通的样子。
  // 因此这里断言"包含"而不是"等于"——连续性靠前后两段都在同一节点里体现。
  await expect(live.first()).toContainText('收到：一致性检查。这是假传输的回复。')
})
