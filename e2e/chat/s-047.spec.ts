import { expect, test } from '@playwright/test'

/** B-047 运行中输入可排队为「引导（steer）」，在当前响应与其工具调用结束后投递 */
test('T-047 运行中提交变成排队，排队行显示引导', async ({ page }) => {
  await page.goto(
    '/sessions?session=01jcchatfixture0000000000001&cwd=/home/berton/evo-pi/packages/web',
  )
  await page.getByTestId('chat-input').fill('第一句')
  await page.getByTestId('chat-send').click()
  // 运行中发送位让位给引导/追加：点「引导」即排队，等当前轮次结束再投递
  await page.getByTestId('chat-input').fill('排队这句')
  await page.getByTestId('chat-steer').click()
  await expect(page.getByTestId('chat-queue')).toContainText('排队这句')
  await expect(page.getByTestId('chat-queue-item').last()).toHaveAttribute('data-mode', 'steer')
})
