/**
 * B-022 信任提示与跳转
 *
 * fixme：信任对话框未接入页面（`/api/project-trust` 已有）
 */
import { test } from '@playwright/test'
import { resetMcpFixture } from './fixture'

test.beforeEach(() => {
  resetMcpFixture()
})

test.fixme('T-27 信任提示与跳转', async () => {
  // 信任对话框未接入页面（`/api/project-trust` 已有）
})
