import { expect, test } from '@playwright/test'

/** B-050 */
test('T-050 运行中发送按钮让位给引导/追加', async ({ page, request }) => {
  // 上一条用例可能把这轮留在运行中：先中止到 idle，否则"运行中"按钮一开始就假
  await request.post('/api/agent/01jcchatfixture0000000000001', { data: { command: 'abort' } })
  await page.goto(
    '/sessions?session=01jcchatfixture0000000000001&cwd=/home/berton/evo-pi/packages/web',
  )
  await page.getByTestId('chat-input').fill('第一句')
  await page.getByTestId('chat-send').click()
  await expect(page.getByTestId('chat-steer')).toBeVisible()
  await expect(page.getByTestId('chat-follow-up')).toBeVisible()
})
