'use client'

import { useState } from 'react'
import { createBrowserClipboard } from './adapters/browser-clipboard'
import { AssistantMessageView } from './assistant-message'
import type { ContentBlock } from './domain/final-answer'
import { formatTimestamp, shouldShowTimestamp } from './domain/timestamps'
/**
 * @design C-03
 * 单条消息：只决定"谁说的 + 用哪个视图"，内容块交给 BlockView。
 *
 * pi-web 里用户消息自带编辑/分支入口（`MessageView.tsx:334`）；
 * 本能力不迁分支（属 C-B），所以这里只有展示与重试。
 */
import { createCopyMessage, isAssistantTruncated, splitFinalBlocks } from './index'
import type { ChatMessage } from './stores/chat-messages'
import { UserMessage } from './user-message'

export function MessageItem({
  message,
  onRetry,
  onEditMessage,
  previousTs,
  entryKey,
}: {
  message: ChatMessage
  onRetry?: (id: string) => void
  /** 编辑用户消息：只改本地视图（持久化要 C-A 的运行时，见 CHG-004） */
  onEditMessage?: (id: string, text: string) => void
  /** 上一条消息的时间：相邻同分钟不重复显示（`MessageView.tsx:726` 同义） */
  previousTs?: number
  /** 稳定锚点：`entryId + 序号`（B-041），搜索定位与 React key 共用同一个值 */
  entryKey?: string
}): React.JSX.Element {
  const isUser = message.role === 'user'
  // 剪贴板端口在这里装配：用例只决定"复制什么"，落到哪由适配器管
  const [copied, setCopied] = useState(false)
  const showTime = shouldShowTimestamp(message.ts, previousTs)
  const time = showTime ? formatTimestamp(message.ts) : null
  // 用户消息没有"过程/回答"之分；assistant 走 splitFinalBlocks 的 answerBlocks
  const blocks: ContentBlock[] = isUser
    ? message.blocks
    : splitFinalBlocks({ content: message.blocks as never }, { isStreaming: message.streaming })
        .answerBlocks

  return (
    <article
      data-testid={`chat-message-${message.role}`}
      data-message-id={message.id}
      data-key={entryKey ?? message.id}
      className={
        isUser
          ? 'my-3 ml-auto max-w-[80%] rounded-lg bg-user-bg px-3 py-2'
          : 'my-3 w-full max-w-[820px] px-4'
      }
    >
      {isUser ? (
        <UserMessage
          text={message.blocks.map((block) => (block.type === 'text' ? block.text : '')).join('\n')}
          onEdit={onEditMessage ? (next) => onEditMessage(message.id, next) : undefined}
        />
      ) : (
        <AssistantMessageView
          blocks={message.blocks}
          answerBlocks={blocks}
          streaming={Boolean(message.streaming)}
          messageId={message.id}
        />
      )}
      {message.errorText ? (
        <div
          data-testid="chat-error"
          role="alert"
          className="mt-1 rounded border border-destructive/40 bg-destructive/10 px-2 py-1 text-xs text-destructive"
        >
          {/* B-038：保留原始错误文本，不改写成"出错了"——排查靠的就是这句话 */}
          {message.errorText}
        </div>
      ) : null}
      {time ? (
        <time
          data-testid="chat-timestamp"
          dateTime={new Date(message.ts ?? 0).toISOString()}
          className="mt-1 block text-[11px] text-muted-foreground"
        >
          {time}
        </time>
      ) : null}
      {!isUser && !message.streaming ? (
        <button
          type="button"
          data-testid="chat-copy"
          aria-label="复制消息"
          onClick={async () => {
            const result = await createCopyMessage({ clipboard: createBrowserClipboard() }).copy(
              message.blocks,
            )
            // 只有真的写进去才显示"已复制"；失败如实提示，不假装成功
            setCopied(result.ok)
          }}
          className="mt-1 rounded px-1 text-xs text-muted-foreground hover:bg-muted"
        >
          {copied ? '已复制' : '复制'}
        </button>
      ) : null}
      {!isUser && !message.streaming && isAssistantTruncated(message.blocks as never) ? (
        <button type="button" data-testid="chat-retry" onClick={() => onRetry?.(message.id)}>
          重试
        </button>
      ) : null}
    </article>
  )
}
