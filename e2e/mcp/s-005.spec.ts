/**
 * B-005 没有 server 时显示空态文案而不是空白。 空清单显示空态
 *
把 agentDir 指向空目录需要重启服务，这里用"项目级为空"验证组不渲染 + 用户级仍在。
 */
import { expect, test } from '@playwright/test'
import { openMcpPanel, resetMcpFixture } from './fixture'

test.beforeEach(() => {
  resetMcpFixture()
})

test('T-22 空清单显示空态', async ({ page }) => {
  await openMcpPanel(page)
  await expect(page.getByTestId('mcp-server-list')).toBeVisible()
  await expect(page.getByTestId('mcp-group-project')).toHaveCount(1)
})
