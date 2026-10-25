import { expect, test } from '@playwright/test'

/** B-048 运行中也可排队为「追加（follow-up）」，语义区分于 steer */
test('T-048 运行中点追加排队，排队行标记 followUp', async ({ page, request }) => {
  // 上一条用例可能把这轮留在运行中：先中止到 idle，否则排队态一开始就假
  await request.post('/api/agent/01jcchatfixture0000000000001', { data: { command: 'abort' } })
  await page.goto(
    '/sessions?session=01jcchatfixture0000000000001&cwd=/home/berton/evo-pi/packages/web',
  )
  await page.getByTestId('chat-input').fill('第一句')
  await page.getByTestId('chat-send').click()
  await page.getByTestId('chat-input').fill('追加这句')
  await page.getByTestId('chat-follow-up').click()
  await expect(page.getByTestId('chat-queue')).toContainText('追加这句')
  await expect(page.getByTestId('chat-queue-item').last()).toHaveAttribute('data-mode', 'followUp')
})
