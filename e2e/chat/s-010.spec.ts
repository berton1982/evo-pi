import { test } from '@playwright/test'

/**
 * B-010 中断：会话运行中发送 abort，运行态回落到空闲
 * 未实现原因：界面未接（T-13…T-20 未开工）
 */
test.fixme('T-010 中断：会话运行中发送 abort，运行态回落到空闲', async () => {
  // 解除条件写在上面的「未实现原因」，实现后改成真实断言
})
