export type { MessageKeyParts } from './domain/message-keys'
export { messageKey, parseMessageKey } from './domain/message-keys'
export type {
  AgentTransport,
  McpRuntime,
  McpRuntimeState,
  SessionReader,
  StreamMode,
  SubagentProfile,
  SubagentProfiles,
  TransportCommand,
  TransportEvent,
  TransportOutcome,
  TransportPrompt,
} from './domain/ports'
export type { SessionPhase, SessionState } from './domain/session-state'
export {
  acceptEvent,
  admit,
  finishTurn,
  initialSessionState,
} from './domain/session-state'
export type { FakeTransportOptions } from './testing/fake-transport'
// 假传输属公共 API：C5 的桩与 H2 的 SSE 路由都靠它把端口跑起来
export { createFakeTransport } from './testing/fake-transport'
export type { AdmissionDecision, AdmitPromptInput } from './use-cases/agent-session'
export { admitPrompt } from './use-cases/agent-session'
export type { ReduceResult } from './use-cases/reduce-agent-event'
export { reduceAgentEvent } from './use-cases/reduce-agent-event'
