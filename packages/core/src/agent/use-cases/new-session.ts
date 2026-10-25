/**
 * @design D-U-04 ensureNewSession / addNotice
 *
 * 新会话的规则（来自 pi SDK 的行为，不是我们的发明）：
 * 客户端先发号，**第一条消息之前不落盘**；落盘后才成为"已存在会话"。
 * 所以这里只做发号与通知队列，绝不提前写文件。
 */
export interface Notice {
  level: 'info' | 'warning' | 'error'
  text: string
  at: number
}

/** 发号：优先用注入的生成器（测试可控），否则用 crypto.randomUUID。 */
export function nextSessionId(
  generator: () => string = () => globalThis.crypto.randomUUID(),
): string {
  return generator()
}

export function createNoticeQueue(limit = 5): {
  add: (level: Notice['level'], text: string, at?: number) => Notice[]
  list: () => readonly Notice[]
  clear: () => void
} {
  let items: Notice[] = []
  return {
    // 只留最近的 limit 条：通知是"刚才发生了什么"，不是日志；
    // 无限增长会让界面上一条 200 行的通知列
    add: (level, text, at = Date.now()) => {
      items = [...items, { level, text, at }].slice(-limit)
      return items
    },
    list: () => items,
    clear: () => {
      items = []
    },
  }
}
