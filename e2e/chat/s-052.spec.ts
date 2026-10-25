import { test } from '@playwright/test'

/**
 * B-052 压缩进行中时按钮变成「停止压缩」，可中断
 * 未实现原因：压缩按钮已画但 compact-context 未接 UI 数据源（需 session stats）
 */
test.fixme('T-052 压缩进行中时按钮变成「停止压缩」，可中断', async () => {
  // 解除条件写在上面的「未实现原因」，实现后改成真实断言
})
