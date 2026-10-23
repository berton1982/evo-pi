/**
 * B-003 两次加载，后到者胜（旧响应不落库）。 后到的响应替换先到的
 *
同一 cwd 连开两次，最终只认最后一轮。
 */
import { expect, test } from '@playwright/test'
import { openMcpPanel, resetMcpFixture } from './fixture'

test.beforeEach(() => {
  resetMcpFixture()
})

test('T-06 后到的响应替换先到的', async ({ page }) => {
  await openMcpPanel(page)
  await expect(page.getByTestId('mcp-row-user/alpha')).toBeVisible()
  // 刷新会关掉弹窗（弹窗状态不持久），reload 后要重新打开——这才是用户的重载路径
  await page.reload()
  await openMcpPanel(page)
  await expect(page.getByTestId('mcp-row-user/beta')).toBeVisible()
})
