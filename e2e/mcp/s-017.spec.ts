/**
 * B-017 添加服务器面板打开
 *
 * fixme：添加面板 C-06 未挂进页面（表单与校验在 core 已实现）
 */
import { test } from '@playwright/test'
import { resetMcpFixture } from './fixture'

test.beforeEach(() => {
  resetMcpFixture()
})

test.fixme('T-36 添加服务器面板打开（B-017）', async () => {
  // 添加面板 C-06 未挂进页面（表单与校验在 core 已实现）
})
