import { expect, test } from '@playwright/test'

/** B-035 复制消息：点击后写入剪贴板并显示「已复制」反馈 */
test('T-035 复制最终回答写入剪贴板并显示反馈', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/sessions?session=01jcchatfixture0000000000001')
  await page.getByTestId('chat-copy').first().click()
  await expect(page.getByTestId('chat-copy').first()).toHaveText('已复制')
  // 只有真的写进剪贴板才算通过：读回来核对文本来自最终回答
  const text = await page.evaluate(() => navigator.clipboard.readText())
  expect(text).toContain('已经按 user/project 分组')
  // 思考与工具日志不参与复制
  expect(text).not.toContain('先看 groups 的排序规则')
})
