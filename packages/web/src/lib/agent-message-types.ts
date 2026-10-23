/**
 * agent-message-types — local mirror of SDK AgentMessage types for web.
 *
 * Why this exists:
 *   web depends on @earendil-works/pi-coding-agent (which transitively
 *   depends on @earendil-works/pi-agent-core + @earendil-works/pi-ai),
 *   but those transitive types are NOT re-exported by the SDK's main
 *   entry point. Importing AgentMessage directly from @earendil-works/
 *   pi-agent-core fails the web build (TS2307).
 *
 * This file declares the subset of AgentMessage / AssistantMessage /
 * UserMessage that the web side actually consumes in PR.A:
 *   - user.content: TextContent[] | string
 *   - assistant.content: TextContent[]
 *   - assistant.provider, model, usage, stopReason, timestamp
 *
 * Source of truth remains pi-web (ref_projects/pi-web/lib/types.ts)
 * and SDK (ref_projects/pi-web/node_modules/@earendil-works/pi-ai/
 * dist/types.d.ts). When SDK's public surface eventually re-exports
 * AgentMessage, this file can be replaced with `import type { AgentMessage
 * } from '@earendil-works/pi-coding-agent'`.
 *
 * Phase 2 PR.A scope (Phase 3+ will widen the union):
 *   - user + assistant text content
 *   - toolResult / custom / bashExecution fall through to "unknown"
 */

export interface TextContent {
  type: 'text'
  text: string
}

export interface UserMessage {
  role: 'user'
  content: string | TextContent[]
  timestamp?: number
}

export interface Usage {
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
  totalTokens: number
  cost: {
    input: number
    output: number
    cacheRead: number
    cacheWrite: number
    total: number
  }
}

export interface AssistantMessage {
  role: 'assistant'
  content: TextContent[]
  api: string
  provider: string
  model: string
  usage: Usage
  stopReason: string
  timestamp?: number
}

/**
 * AgentMessage — local discriminated union.
 *
 * In real SDK this is `Message | CustomAgentMessages[keyof CustomAgentMessages]`
 * from pi-agent-core. PR.A minimum only needs user + assistant. Other
 * roles (toolResult, custom, bashExecution, system) are accepted via
 * the unknown fallback so callers don't crash.
 *
 * The fallback is `unknown` rather than `never` because pi-web real
 * sessions carry toolResult messages whose shape varies by tool.
 */
export type AgentMessage = UserMessage | AssistantMessage | { role: string; [k: string]: unknown }
