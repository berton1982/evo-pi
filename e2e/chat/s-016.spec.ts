import { test } from '@playwright/test'

/**
 * B-016 受限模式：打开后隐藏部分高风险入口（工具定义）
 * 未实现原因：对应界面尚未接入（见 behaviors.md 该行的证据与 T-xx 任务状态）
 */
test.fixme('T-016 受限模式：打开后隐藏部分高风险入口（工具定义）', async () => {
  // 解除条件：接入后在 products 里给出真实定位，再改成真实断言
})
