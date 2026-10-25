/**
 * 会话面能力（web 侧）的对外入口：**只放呈现逻辑**。
 *
 * 判据来自 ADR-0001 的分层：`core/src/chat/{domain,use-cases}` 是业务规则
 * （发送的幂等与 steering 语义、apply_patch 解析、中断/压缩），
 * 这里只留"哪块算最终回答"（展示映射）与"什么时候滚动到底"（几何）。
 * 两边的分界不是"谁调用"，而是"这条规则离开界面还成不成立"。
 */

// 业务规则一律来自 @evo-pi/core/chat（ADR-0001）；这里只转出本能力自己的名字
export {
  copyableText,
  createAbortTurn,
  createCompactContext,
  createCopyMessage,
  createSendTurn,
} from '@evo-pi/core/chat'
export { ChatSurface } from './chat-surface'
export { createFakeTransport } from './dev-fake-transport'
export * from './domain/app-update-banner'
export * from './domain/chat-scroll'
export * from './domain/final-answer'
