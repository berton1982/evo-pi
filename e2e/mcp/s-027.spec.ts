/**
 * B-027 发起签到进入等待授权
 *
 * fixme：签到 UI 未接；`/api/mcp/sign-in` 路由未实现
 */
import { test } from '@playwright/test'
import { resetMcpFixture } from './fixture'

test.beforeEach(() => {
  resetMcpFixture()
})

test.fixme('T-29 发起签到进入等待授权', async () => {
  // 签到 UI 未接；`/api/mcp/sign-in` 路由未实现
})
