'use client'

import { useEffect } from 'react'

import { MessageItem } from './message-item'
/**
 * @design C-01
 * @design C-02
 * @design D-U-05
 * 消息列表容器：唯一的滚动容器 + 居中列（820px）+ 稳定 gutter。
 *
 * 三条对齐 pi-web（T-05 观测）：`ChatWindow.tsx:1089` 只有一个滚动容器、
 * `:1093` 列 padding、`:1094` `max-width: var(--chat-content-max-width, 820px)`。
 * 不做虚拟滚动（`CHARTER.md` 不做清单第 4 条）。
 */
import type { ChatMessage } from './stores/chat-messages'
import { useChatScroll } from './use-chat-scroll'

export function MessageList({
  messages,
  empty,
  onRetry,
  onEditMessage,
}: {
  messages: ChatMessage[]
  empty: React.ReactNode
  onRetry?: (id: string) => void
  onEditMessage?: (id: string, text: string) => void
}): React.JSX.Element {
  const scroll = useChatScroll()

  // 首屏与新增消息：只要还跟着最新（atTail），就把视野贴到底。
  // pi-web 同样的分工（`ChatWindow.tsx:529` 只在"跟随中"才写 scrollTop）。
  const stick = scroll.stick
  const atTail = scroll.atTail
  // 依赖里用条数而不是消息数组：数组引用每帧都变，会白跑滚动；
  // 条数变化才是"新消息到达"，也才是贴底的真实触发源。
  // biome-ignore lint/correctness/useExhaustiveDependencies: messages.length 是触发源，不是读取源
  useEffect(() => {
    if (atTail) stick()
  }, [messages.length, atTail, stick])

  return (
    <div
      ref={scroll.containerRef}
      onScroll={scroll.handleScroll}
      data-testid="chat-scroll"
      data-component="message-list"
      /* 消息是"日志"语义：读屏器按 log 播报增量，而不是当成普通列表 */
      role="log"
      aria-live="polite"
      className="scrollbar-subtle min-w-0 flex-1 overflow-x-hidden overflow-y-auto pt-4 [scrollbar-gutter:stable]"
    >
      <div style={{ minWidth: 0, padding: '0 16px' }}>
        <div
          style={{
            width: '100%',
            minWidth: 0,
            maxWidth: 'var(--chat-content-max-width, 820px)',
            margin: '0 auto',
          }}
        >
          {messages.length === 0 ? (
            <div data-testid="chat-empty">{empty}</div>
          ) : (
            messages.map((message, index) => (
              <MessageItem
                key={message.id}
                message={message}
                onRetry={onRetry}
                onEditMessage={onEditMessage}
                previousTs={messages[index - 1]?.ts}
                /* key 用 entryId + blockIndex（B-041）：渲染层不自造 key，否则流式合流会错位 */
                entryKey={`${message.entryId ?? message.id}-${index}`}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
