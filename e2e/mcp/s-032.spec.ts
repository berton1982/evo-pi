import { expect, test } from '@playwright/test'
import { openMcpPanel } from './fixture'

// T-37 移除一个 server（B-032）：列表与磁盘同步、选中项清空
// 移除会改磁盘快照：与其它 spec 共用一份夹具时会互相干扰，等 e2e 引入 per-test 夹具后再打开
// （真实移除路径已由 packages/core/src/mcp/use-cases/remove-server.test.ts 的 T-37 覆盖）
test.fixme('T-37 移除 server 后列表同步且清空选中', async ({ page }) => {
  await openMcpPanel(page)
  await page.getByRole('button', { name: /^zeta/, exact: false }).first().click()
  await page.getByRole('button', { name: '移除' }).click()
  await expect(page.getByTestId('mcp-detail-placeholder')).toBeVisible()
})
