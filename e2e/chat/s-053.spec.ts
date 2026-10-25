import { expect, test } from '@playwright/test'

/** B-053 附件可添加/移除，发送时随消息一起提交 */
test('T-053 添加附件后出现条目，可移除', async ({ page }) => {
  await page.goto('/sessions?session=01jclongsession0000000000001&cwd=/home/berton/evo-pi')
  await page.getByTestId('chat-input').waitFor({ timeout: 15000 })
  // 必须走真实 file chooser：直接改 input.value 是假的
  const chooser = page.waitForEvent('filechooser')
  await page.getByTestId('chat-attach').click()
  const file = await chooser
  await file.setFiles({
    name: 'notes.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from('# 附件'),
  })
  const chip = page.getByTestId('chat-attachment').filter({ hasText: 'notes.md' })
  await expect(chip).toBeVisible()
  await chip.getByTestId('chat-attachment-remove').click()
  await expect(page.getByTestId('chat-attachment')).toHaveCount(0)
})
