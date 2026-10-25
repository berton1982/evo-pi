import { expect, test } from '@playwright/test'

/** B-046 无障碍：消息列表为 log 语义，运行态通过 aria-live 播报 */
test('T-046 消息区是 log 语义且 aria-live=polite', async ({ page }) => {
  await page.goto('/sessions?session=01jclongsession0000000000001&cwd=/home/berton/evo-pi')
  const scroll = page.getByTestId('chat-scroll')
  await expect(scroll).toHaveAttribute('role', 'log')
  await expect(scroll).toHaveAttribute('aria-live', 'polite')
  // 输入框有可读标签（不是 placeholder 当标签）
  await expect(page.getByTestId('chat-input')).toHaveAttribute('aria-label', /.+/)
})
