import { expect, test } from '@playwright/test'

/** B-034 用户消息可编辑：进入编辑态、保存后替换文本并回到只读 */
test('T-034 编辑用户消息：保存后正文替换且回到只读', async ({ page }) => {
  await page.goto('/sessions?session=01jclongsession0000000000001&cwd=/home/berton/evo-pi')
  const edit = page.getByTestId('chat-user-edit').first()
  await expect(edit).toBeVisible({ timeout: 15000 })
  await edit.click()
  const input = page.getByTestId('chat-user-edit-input').first()
  await expect(input).toBeVisible()
  await input.fill('改过之后的提问文本')
  await page.getByTestId('chat-user-edit-save').first().click()
  await expect(page.getByTestId('chat-user-edit-input')).toHaveCount(0)
  await expect(page.getByTestId('chat-user-bubble').first()).toContainText('改过之后的提问文本')
})
