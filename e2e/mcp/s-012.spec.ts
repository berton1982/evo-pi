/**
 * B-012 停用写入 disabled 字段。 停用态回写成 disabled
 *
停用后再启用，状态要能回滚。
 */
import { expect, test } from '@playwright/test'
import { openMcpPanel, resetMcpFixture } from './fixture'

test.beforeEach(() => {
  resetMcpFixture()
})

test('T-13b 停用态回写成 disabled', async ({ page }) => {
  await openMcpPanel(page)
  const box = page.getByTestId('mcp-row-user/beta').getByRole('switch')
  const before = await box.isChecked()
  await box.click()
  await expect(box).toBeChecked({ checked: !before })
  await box.click()
  await expect(box).toBeChecked({ checked: before })
})
