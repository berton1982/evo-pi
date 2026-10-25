// C-C 会话面：设计骨架。进 tsc，编译不过就是设计没定稿。
// 只放"跨边界契约"（端口 + 用例入参出参 + 视图入参），不放实现。

export type Outcome<T> = { ok: true; value: T } | { ok: false; error: { code: string; message?: string } }

export type MessageBlock =
  | { kind: 'text'; text: string }
  | { kind: 'thinking'; text?: string; pending?: boolean }
  | { kind: 'toolCall'; toolCallId: string; name: string; status: 'running' | 'done' | 'failed'; durationMs?: number }

export interface ChatMessage {
  entryId: string
  role: 'user' | 'assistant' | 'system'
  model?: string
  blocks: MessageBlock[]
  at: number
}

/** P-C-01 agent 传输（实现由 C-A 提供，本能力只消费） */
export interface AgentTransport {
  send(command: 'prompt' | 'abort' | 'compact', payload: unknown): Promise<Outcome<void>>
  subscribe(handler: (event: { requestId: number; type: string; payload: unknown }) => void): () => void
}

/** P-C-02 会话读 */
export interface ChatSessionReader {
  readPage(
    sessionId: string,
    opts: { before?: string; limit?: number },
  ): Promise<Outcome<{ messages: ChatMessage[]; hasMore: boolean }>>
}

/** P-C-03 文件打开 */
export interface FileOpener {
  openFile(path: string, line?: number): void
}

/** P-C-04 剪贴板 */
export interface Clipboard {
  write(text: string): Promise<Outcome<void>>
}

export declare function createListPage(deps: { reader: ChatSessionReader }): {
  load(sessionId: string, opts: { before?: string }): Promise<Outcome<{ messages: ChatMessage[]; hasMore: boolean }>>
}

export declare function createSendTurn(deps: { agent: AgentTransport }): {
  send(input: { sessionId: string; text: string; running: boolean }): Promise<Outcome<void>>
}

export declare function createCopyMessage(deps: { clipboard: Clipboard }): {
  copy(text: string): Promise<Outcome<void>>
}

export interface ChatSurfaceProps {
  cwd: string | null
  sessionId: string | null
  onOpenFile: (path: string, line?: number) => void
}
