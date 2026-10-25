/**
 * @design P-C-01
 * agent 传输端口（实现由 C-A 提供，本能力只消费）。
 *
 * 为什么在领域层定义而不是直接依赖 `useAgentSession`：C-A 的运行时是一个 2,805 行的
 * 事件中枢，如果 C-C 直接 import 它，两个能力的失败就绑在一起；这里只钉三件事：
 * 发一条命令、订阅事件流、取消订阅。
 */

export type TransportCommand = 'prompt' | 'abort' | 'compact'

/** 流式行为的两种排队语义：`steer` 跟随当前轮次，`followUp` 排到下一轮。 */
export type StreamMode = 'steer' | 'followUp'

export interface TransportEvent {
  requestId: number
  type: string
  payload: unknown
}

export type TransportOutcome =
  | { ok: true; value?: { requestId?: number } }
  | { ok: false; error: { code: string; message?: string } }

export interface PromptPayload {
  sessionId: string
  text: string
  mode?: StreamMode
  /** 客户端幂等键：同一个键重复提交只发一次（双击/重试用同一个键）。 */
  clientRequestId?: string
}

export interface AgentTransport {
  send(command: TransportCommand, payload: unknown): Promise<TransportOutcome>
  subscribe(handler: (event: TransportEvent) => void): () => void
}
