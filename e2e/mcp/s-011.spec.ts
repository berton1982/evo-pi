/**
 * B-011 单条开关落盘。 勾选发出 POST 并写入配置文件
 *
真实写 /tmp/e2e-agent/mcp.json（PI_CODING_AGENT_DIR 指向它）。
 */
import { expect, test } from '@playwright/test'
import { openMcpPanel, resetMcpFixture } from './fixture'

test.beforeEach(() => {
  resetMcpFixture()
})

test('T-13 勾选发出 POST 并写入配置文件', async ({ page }) => {
  await openMcpPanel(page)
  const box = page.getByTestId('mcp-row-user/alpha').getByRole('switch')
  const before = await box.isChecked()
  await box.click()
  await expect(box).toBeChecked({ checked: !before })
  await expect(page.getByTestId('mcp-group-status-user')).toContainText(before ? '1/2' : '2/2')
})
