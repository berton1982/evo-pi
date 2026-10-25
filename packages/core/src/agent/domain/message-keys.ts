/**
 * @design D-U-11
 * 消息键：`entryId + blockIndex`。
 *
 * 为什么要拼两层键而不是只用户消息 id：一条助手消息里有多个内容块，
 * 而块可能在流式过程中被替换（thinking → text），只按消息 id 会让 React 复用错节点，
 * 表现是"内容串到上一条去"。pi-web 的 `MessageView` 也按 (entryId, index) 定位。
 */
export interface MessageKeyParts {
  entryId: string
  blockIndex: number
}

export function messageKey({ entryId, blockIndex }: MessageKeyParts): string {
  return `${entryId}#${blockIndex}`
}

/** 从 `id#3` 解析回部件；解析不出来返回 null（不要静默返回 0，会把不同块当成同一块）。 */
export function parseMessageKey(key: string): MessageKeyParts | null {
  const at = key.lastIndexOf('#')
  if (at <= 0) return null
  const index = Number(key.slice(at + 1))
  if (!Number.isInteger(index) || index < 0) return null
  return { entryId: key.slice(0, at), blockIndex: index }
}
