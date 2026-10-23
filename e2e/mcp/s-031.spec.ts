/**
 * B-031 状态行日志可展开/收起
 *
 * fixme：详情面板里的 `McpStatusRow`（D-U-08）已实现但未挂进 `McpServerDetail`，
 * 页面上没有 `mcp-status-row` 节点——挂上之后这条才有意义。
 */
import { test } from '@playwright/test'
import { resetMcpFixture } from './fixture'

test.beforeEach(() => {
  resetMcpFixture()
})

test.fixme('T-24 状态行日志可展开/收起', async () => {
  // 详情面板挂上 mcp-status-row 后：断言 aria-expanded 随点击翻转
})
