'use client'

/**
 * @design D-U-08
 * 流式回答：只要还在流，就不显示"截断"结论（`final-answer.ts` 的 `isStreaming`）。
 * 光标是纯装饰，不进可及名称。
 */
import { MarkdownBody } from './markdown-body'

export function StreamingReply({
  text,
  active,
}: {
  text: string
  active: boolean
}): React.JSX.Element {
  return (
    <div data-testid="chat-streaming" aria-busy={active} className="text-sm">
      <MarkdownBody text={text} />
      {active ? (
        <span aria-hidden="true" className="ml-0.5 inline-block animate-pulse">
          ▍
        </span>
      ) : null}
    </div>
  )
}
