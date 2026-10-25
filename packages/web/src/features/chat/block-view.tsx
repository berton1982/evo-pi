/**
 * @design D-U-12
 * 内容块渲染：text / thinking / toolCall 三类。
 *
 * 判别联合来自本能力的 `domain/final-answer.ts`（L1 已测），
 * 这里只做分支与样式，不再自己判断"哪个块算回答"。
 */
import { splitPatch } from '@evo-pi/core/chat'
import { SplitDiff } from './diff/split-diff'
import { type ContentBlock, pairToolResults } from './domain/final-answer'
import { MarkdownBody } from './markdown-body'
import { useChatSessionId } from './thinking-context'
import { ToolCallBlock } from './tool-call-block'
import { useThinkingContent } from './use-thinking-content'

export function BlockView({
  block,
  messageId,
  siblingBlocks,
}: {
  block: unknown
  /** 用于按需加载思考正文（缺失时只显示占位） */
  messageId?: string
  /** 同一条消息的其它块：工具结果要按 toolCallId 贴回调用块 */
  siblingBlocks?: readonly unknown[]
}): React.JSX.Element | null {
  const typed = block as ContentBlock
  if (!typed || typeof typed !== 'object') return null
  // 文本块必须走 MarkdownBody：直接 <p>{text}</p> 会把表格/列表/链接渲染成一堆原文
  if (typed.type === 'text') return <MarkdownBody text={typed.text} />
  if (typed.type === 'thinking') return <ThinkingBlock inline={typed.text} messageId={messageId} />
  if (typed.type === 'image')
    // biome-ignore lint/performance/noImgElement: 附件是 data: URL，next/image 需要域名白名单，这里给不了
    return <img alt="附件" className="max-h-64 rounded" src={typed.data} />
  if (typed.type === 'toolCall') {
    const call = typed as unknown as {
      toolCallId?: string
      /** pi SDK 的调用块用 `id`（不是 toolCallId）——只认一个会让结果永远贴不回来 */
      id?: string
      name?: string
      arguments?: unknown
    }
    const callId = call.toolCallId ?? call.id ?? ''
    const paired = pairToolResults(siblingBlocks ?? []).get(callId)
    const input = call.arguments === undefined ? undefined : JSON.stringify(call.arguments, null, 2)
    return (
      <div data-tool-block={call.name}>
        <ToolCallBlock
          call={{
            toolCallId: callId,
            name: call.name ?? 'unknown',
            input,
            // 空结果不显示（"没有输出"与"没跑完"是两件事，前者不该占一块地方）
            result: paired?.text || undefined,
            failed: paired?.failed,
            // 耗时优先用结果里记录的值（B-029），没有就不显示
            durationMs: paired?.durationMs,
          }}
        />
        {paired?.text && splitPatch(paired.text).length > 0 ? (
          <SplitDiff patch={paired.text} />
        ) : null}
      </div>
    )
  }
  return <p className="font-mono text-xs">调用工具：{String((typed as { name?: string }).name)}</p>
}

/** 思考块：先显示占位，取到正文后替换（正文来自 `/api/sessions/[id]/context`） */
function ThinkingBlock({
  inline,
  messageId,
}: {
  inline?: string
  messageId?: string
}): React.JSX.Element {
  const sessionId = useChatSessionId()
  const { text, loading } = useThinkingContent(sessionId, messageId)
  const body = text ?? inline
  if (body) {
    return (
      <p
        data-testid="chat-thinking"
        className="text-muted-foreground text-xs italic whitespace-pre-wrap"
      >
        {body}
      </p>
    )
  }
  return (
    <p data-testid="chat-thinking-loading" className="text-muted-foreground text-xs italic">
      {loading ? '思考中…' : '思考正文没取到'}
    </p>
  )
}
