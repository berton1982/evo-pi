/**
 * B-020 组批量部分失败的逐条回填
 *
 * fixme：需要"一个旧版不可写"的夹具才能造出部分失败；真实写盘会污染其他用例
 */
import { test } from '@playwright/test'
import { resetMcpFixture } from './fixture'

test.beforeEach(() => {
  resetMcpFixture()
})

test.fixme('T-26 组批量部分失败的逐条回填', async () => {
  // 需要"一个旧版不可写"的夹具才能造出部分失败；真实写盘会污染其他用例
})
