/**
 * AgentMessage + SessionContext re-exports.
 *
 * AgentMessage lives in `@earendil-works/pi-agent-core` (SDK 内部依赖)，
 * 而非 `@earendil-works/pi-coding-agent`（SDK v1.1.0 不 re-export）。
 *
 * 所以 evo-pi 同时依赖 pi-coding-agent + pi-agent-core：
 * - pi-coding-agent：SessionInfo / SessionEntry / SessionManager 等高层 API
 * - pi-agent-core：AgentMessage / Agent / EventBus 等低层类型
 *
 * AgentMessage 是 SDK 中多个 handler 的输入/输出参数（prompt / steer /
 * follow_up 等），所以所有 capability 都会引用——这是跨 SDK 的公共契约。
 *
 * Ruling — AgentMessage from pi-agent-core (not pi-coding-agent).
 * SDK v1.1.0 imports AgentMessage from pi-agent-core but does not re-export.
 * evo-pi consumers should import via @evo-pi/core's barrel to avoid touching
 * the SDK package split. Cost if wrong: trivial (1-line import path change).
 */

export type { AgentMessage } from '@earendil-works/pi-agent-core'

export type {
  NewSessionOptions,
  SessionContext,
  SessionHeader,
} from '@earendil-works/pi-coding-agent'
