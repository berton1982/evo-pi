'use client'

/**
 * @design D-U-11
 * 助手消息视图：过程（思考/工具）与「最终回答」分开，过程可折叠。
 *
 * 依据 `MessageView.tsx:906`（只有 text/image 允许折叠过程）与
 * `MessageView.tsx:1176`（工具块的 block 与 result 分开传，结果后到要先显示 block）。
 */
import { useState } from 'react'
import { BlockView } from './block-view'
import type { ContentBlock } from './domain/final-answer'

export function AssistantMessageView({
  blocks,
  answerBlocks,
  streaming,
  errorText,
  messageId,
}: {
  blocks: ContentBlock[]
  answerBlocks: ContentBlock[]
  streaming: boolean
  errorText?: string
  /** 思考正文按需加载要用它定位消息 */
  messageId?: string
}): React.JSX.Element {
  const [processOpen, setProcessOpen] = useState(false)
  const processBlocks = blocks.slice(0, Math.max(0, blocks.length - answerBlocks.length))
  const collapsible = processBlocks.every(
    (block) => block.type === 'text' || block.type === 'image',
  )

  return (
    <div data-testid="chat-assistant" className="space-y-2">
      {processBlocks.length > 0 ? (
        <div data-testid="chat-process">
          <button
            type="button"
            data-testid="chat-process-toggle"
            aria-expanded={processOpen || !collapsible}
            aria-disabled={!collapsible}
            onClick={() => {
              if (collapsible) setProcessOpen((open) => !open)
            }}
            className="text-xs text-muted-foreground"
          >
            {collapsible ? (processOpen ? '收起过程' : `过程（${processBlocks.length}）`) : '过程'}
          </button>
          {collapsible && !processOpen ? null : (
            <div className="mt-1 space-y-1 border-border border-l pl-2">
              {processBlocks.map((block, blockIndex) => {
                const blockKey = `${messageId}-process-${blockIndex}`
                return (
                  <BlockView
                    // 块没有稳定 id：同一消息内的块顺序在流式过程中只追加不重排，
                    // 所以 (messageId, index, 类别) 是这里唯一稳定的键（别再换成 Math.random）
                    key={blockKey}
                    block={block}
                    messageId={messageId}
                    siblingBlocks={blocks}
                  />
                )
              })}
            </div>
          )}
        </div>
      ) : null}

      {answerBlocks.map((block, blockIndex) => {
        const blockKey = `${messageId}-answer-${blockIndex}`
        return <BlockView key={blockKey} block={block} siblingBlocks={blocks} />
      })}

      {errorText ? (
        <p data-testid="chat-assistant-error" role="alert" className="text-sm text-destructive">
          {errorText}
        </p>
      ) : null}
      {streaming ? <span data-testid="chat-streaming-cursor">▍</span> : null}
    </div>
  )
}
