import { test } from '@playwright/test'

/**
 * B-014 压缩上下文：触发 compact 并显示压缩进度，可中断
 * 未实现原因：压缩按钮已画但 compact-context 未接 UI 数据源（需 session stats）
 */
test.fixme('T-014 压缩上下文：触发 compact 并显示压缩进度，可中断', async () => {
  // 解除条件写在上面的「未实现原因」，实现后改成真实断言
})
