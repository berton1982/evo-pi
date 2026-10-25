import { randomUUID } from 'node:crypto'

/**
 * 新建会话（只发号，不落盘）。
 *
 * 为什么不在服务端建文件：pi SDK 的 `SessionManager` 明确写着
 * "A new session file is created only once the session contains a user or assistant
 * message. Setup entries alone stay in memory so opening and closing pi without
 * chatting leaves no file behind."
 * 我们照这个语义做——`POST /api/sessions` 只返回一个新 id，等第一条消息落盘时
 * 才真正产生 JSONL。反过来做（先写一个只有 header 的空文件）会让 pi 的会话列表
 * 里出现一批点开就空的会话，而 SDK 自己不会产生这种文件。
 *
 * @design D-A-01（能力 C-A 落地后由 agent 侧在同一 id 上写第一条消息）
 */
export interface NewSession {
  id: string
  cwd: string
  isNew: true
}

export function createNewSession(cwd: string): NewSession {
  return { id: randomUUID(), cwd, isNew: true }
}
