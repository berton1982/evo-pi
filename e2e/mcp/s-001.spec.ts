/**
 * B-001 首载：进入设置页即拉一次清单，按作用域分组渲染。 首载渲染两组服务器
 *
能跑的只有已接通 UI 的流程（列表/分组/开关/组批量/测试态/状态行）。
 */
import { expect, test } from '@playwright/test'
import { openMcpPanel, resetMcpFixture } from './fixture'

test.beforeEach(() => {
  resetMcpFixture()
})

test('T-05 首载渲染两组服务器', async ({ page }) => {
  await openMcpPanel(page)
  await expect(page.getByTestId('mcp-server-list')).toBeVisible()
  await expect(page.getByTestId('mcp-group-user')).toBeVisible()
  await expect(page.getByTestId('mcp-group-project')).toBeVisible()
  // 用户级两个（alpha stdio / beta http），项目级一个（gamma）
  await expect(page.getByTestId('mcp-row-user/alpha')).toBeVisible()
  await expect(page.getByTestId('mcp-row-user/beta')).toBeVisible()
  await expect(page.getByTestId('mcp-row-project/gamma')).toBeVisible()
})
