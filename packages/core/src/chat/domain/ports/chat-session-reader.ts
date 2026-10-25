/**
 * @design P-C-02
 * 会话读：把「读某一轮的思考正文 / 统计」这类需要后端权限的事挡在端口后面。
 *
 * pi-web 是前端直连 `/api/sessions/**`（`MessageView.tsx:162 loadThinkingContent`），
 * 迁到 evo-pi 后这类读取要走服务端，所以这里只定义契约，实现住 adapters。
 */
export interface ChatSessionReader {
  /** 读取某条消息的思考正文；缺失时返回 null，不抛错 */
  readThinking(input: { sessionId: string; messageId: string }): Promise<string | null>
  /** 读取会话统计（token / 轮次），用于状态行 */
  readStats(input: { sessionId: string }): Promise<{ tokens: number; turns: number } | null>
}
