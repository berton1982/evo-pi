export * from './adapters/http-chat-session-reader'
/**
 * 会话面能力的**业务规则**（后端 4 层的第 1–2 层）。
 *
 * 判据来自 ADR-0001：`core/src/<capability>/{domain,use-cases,ports}` 放业务规则，
 * `web/src/features/*` 只放呈现（组件 / UI hook / 滚动几何 / 展示映射）。
 * 所以"发送一条消息的幂等与 steering 语义"、"apply_patch 的解析"在这里，
 * 而"哪块算最终回答、什么时候滚动到底"在 web。
 */
export * from './domain/patch-diff'
export * from './domain/ports/agent-transport'
export * from './domain/ports/chat-session-reader'
export * from './domain/ports/clipboard'
export * from './domain/ports/file-opener'
export * from './use-cases/abort-turn'
export * from './use-cases/compact-context'
export * from './use-cases/copy-message'
export * from './use-cases/send-turn'
