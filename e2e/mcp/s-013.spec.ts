/**
 * B-013 撤销条回滚刚刚的开关
 *
 * fixme：页面还没有撤销条 UI（`useMcpActions.remove` 与 `isUndoUsable` 已实现，条未挂）
 */
import { test } from '@playwright/test'
import { resetMcpFixture } from './fixture'

test.beforeEach(() => {
  resetMcpFixture()
})

test.fixme('T-18b 撤销条回滚刚刚的开关', async () => {
  // 页面还没有撤销条 UI（`useMcpActions.remove` 与 `isUndoUsable` 已实现，条未挂）
})
