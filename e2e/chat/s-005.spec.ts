import { test } from '@playwright/test'

/**
 * B-005 切换会话时按上次记录恢复滚动位置。
 *
 * 未实现原因（2026-10-25 更新）：壳的高度链已修好（`center-pane` 的 `h-full flex-1`），
 * 真正缺的是**能力里没有滚动位置记忆**——`use-chat-scroll` 只有 `atTail`，
 * 没有按 sessionId 存/取 scrollTop 的那一层（pi-web 在 `ChatWindow.tsx:513` 附近做的）。
 * 解除条件：实现 scrollMemory（Map<sessionId, scrollTop> + 切换时 restore），再改真断言。
 */
test.fixme('T-005 切换会话时按上次记录恢复滚动位置', async () => {
  // 缺 scrollMemory
})
