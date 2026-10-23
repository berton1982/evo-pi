/**
 * B-004 清单读失败时整页报错条，不显示半份列表。 加载失败整体降级
 *
cwd 指向不存在的目录时只剩用户级 server，不再显示项目级。
 */
import { expect, test } from '@playwright/test'
import { openMcpPanel, resetMcpFixture } from './fixture'

test.beforeEach(() => {
  resetMcpFixture()
})

test('T-07 加载失败整体降级', async ({ page }) => {
  await openMcpPanel(page)
  await openMcpPanel(page, '/tmp/definitely-missing')
  await expect(page.getByTestId('mcp-group-user')).toBeVisible()
  await expect(page.getByTestId('mcp-group-project')).toHaveCount(0)
})
