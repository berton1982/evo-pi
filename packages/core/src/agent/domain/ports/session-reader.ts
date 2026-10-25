/**
 * @design P-A-02
 * 会话读端口：读一条会话的 JSONL 与元信息。
 *
 * 读与写分开：读是幂等的、可缓存的、可 single-flight 的；写走传输端口。
 * pi-web 里两者混在 `useAgentSession` 一个 hook 里，是这个文件 2,805 行的原因之一。
 */
export interface SessionMeta {
  id: string
  cwd: string
  title?: string
  updatedAt?: string
}

export interface SessionReadResult {
  meta: SessionMeta
  /** 原始 JSONL 行（保持顺序）；解析交给 domain 的纯函数，端口不猜格式。 */
  lines: string[]
}

export interface SessionReader {
  read(sessionId: string, opts?: { cwd?: string; tail?: number }): Promise<SessionReadResult | null>
}
