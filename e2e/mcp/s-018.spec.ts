/**
 * B-018 添加成功后刷新列表
 *
 * fixme：同上：添加面板未挂
 */
import { test } from '@playwright/test'
import { resetMcpFixture } from './fixture'

test.beforeEach(() => {
  resetMcpFixture()
})

test.fixme('T-25b 添加成功后刷新列表', async () => {
  // 同上：添加面板未挂
})
