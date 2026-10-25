// 设计骨架：进 tsc，编译不过就是设计没定稿。
// 只有类型，没有实现——实现落在 C5。

export interface Command<TArgs = unknown, TResult = unknown> {
  readonly name: string
  readonly generation: number
  readonly args: TArgs
  readonly result?: TResult
}

/** P-A-01：命令进、事件出，两个方向都在一个端口里（同一连接） */
export interface AgentTransportPort {
  send(cmd: Command): Promise<{ ok: boolean; error?: { code: string; message?: string } }>
  subscribe(handler: (event: AgentEvent) => void): () => void
  close(): void
}

export type AgentEvent =
  | { type: 'connected' }
  | { type: 'message_start'; id: string; role: 'user' | 'assistant' }
  | { type: 'message_update'; id: string; delta: string; requestId: number }
  | { type: 'message_end'; id: string; text: string }
  | { type: 'tool_execution_start'; toolCallId: string; name: string }
  | { type: 'queue_update'; queue: { steering: string[]; followUp: string[] } }
  | { type: 'auto_compaction_start' }
  | { type: 'agent_end' }

/** P-A-02：会话读（single-flight 由用例层保证，端口只管读） */
export interface SessionRepositoryPort {
  readSession(id: string): Promise<{ ok: true; entries: unknown[] } | { ok: false; code: string }>
  listSessions(cwd: string): Promise<{ id: string; cwd: string; mtime: number }[]>
}

/** P-A-03：MCP 运行时（复用 C-G 的端口形状，不重写协议） */
export interface McpRuntimePort {
  prepare(signal: AbortSignal, wait: boolean): Promise<'ready' | 'degraded'>
  listTools(): Promise<{ name: string; inputSchema: unknown }[]>
}

/** P-A-04：子代理档案 */
export interface AgentProfilePort {
  list(cwd: string): Promise<{ name: string; scope: 'user' | 'project'; body: string }[]>
  save(profile: { name: string; scope: 'user' | 'project'; body: string }, cwd: string): Promise<void>
  remove(name: string, scope: 'user' | 'project', cwd: string): Promise<void>
}

/** 用例：分发 / 准入 / 归约 / 读会话 / 准备 MCP / 档案 */
export declare function dispatchCommand(deps: {
  transport: AgentTransportPort
  admission: { acquire(sessionId: string): Promise<() => void> }
}): (cmd: Command, sessionId: string) => Promise<{ ok: boolean; error?: { code: string } }>

export declare function admitPrompt(deps: {
  admission: { acquire(sessionId: string): Promise<() => void> }
}): (sessionId: string) => Promise<() => void>

export declare function reduceEvent(state: AgentState, event: AgentEvent): AgentState

export interface AgentState {
  readonly connection: 'connecting' | 'ready' | 'closed'
  readonly messages: readonly { id: string; role: 'user' | 'assistant'; text: string }[]
  readonly queue: { steering: readonly string[]; followUp: readonly string[] }
  readonly notices: readonly { id: string; text: string; exiting: boolean }[]
  readonly requestId: number
}
