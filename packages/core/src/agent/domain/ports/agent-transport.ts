/**
 * @design P-A-01
 * 传输端口：发命令 + 订阅事件。
 *
 * 只钉三件事（发命令、订阅、退订），因为 C-A 的源实现是 2,800 行的 `useAgentSession`，
 * 上层不该看见它的内部结构；换成 HTTP/SSE 或内存假实现都不改调用方。
 */
export type TransportCommand =
  | 'prompt'
  | 'steer'
  | 'followUp'
  | 'abort'
  | 'compact'
  | 'setModel'
  | 'setTools'

/** 流式语义：`steer` 跟随当前轮次，`followUp` 排到下一轮。 */
export type StreamMode = 'steer' | 'followUp'

export interface TransportEvent {
  requestId: number
  type: string
  payload: unknown
}

export type TransportOutcome =
  | { ok: true; value?: { requestId?: number } }
  | { ok: false; error: { code: string; message?: string } }

export interface TransportPrompt {
  sessionId: string
  text: string
  mode?: StreamMode
  /** 幂等键：同一键重复提交只发一次（双击/重试用同一个键）。 */
  clientRequestId?: string
}

export interface AgentTransport {
  send(command: TransportCommand, payload: unknown): Promise<TransportOutcome>
  subscribe(handler: (event: TransportEvent) => void): () => void
}
