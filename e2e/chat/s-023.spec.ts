import { test } from '@playwright/test'

/**
 * B-023 上行回调容错：会话未就绪时调用 onSoundToggle/onOpenSettings 不抛错
 * 未实现原因：界面未接（T-13…T-20 未开工）
 */
test.fixme('T-023 上行回调容错：会话未就绪时调用 onSoundToggle/onOpenSett', async () => {
  // 解除条件写在上面的「未实现原因」，实现后改成真实断言
})
