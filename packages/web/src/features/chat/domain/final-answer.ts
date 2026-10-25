/**
 * @design D-B-04
 * @design D-U-03
 * 「最终回答」与"过程折叠"的纯函数。
 *
 * 移植自 `ref_projects/pi-web/lib/message-display.ts:104-172` 与 `lib/turn-views.ts:31-54`。
 * 为什么必须是纯函数：这两条判定直接决定"用户看到的最后一条到底是什么"，
 * 一旦混进 React 状态就没法在 L1 层用表格把边界钉住（见 `specs/C-C-S-01.md` 的决策表）。
 */

/** 只依赖"块"的形状，不依赖 SDK 的消息类，避免领域层被 SDK 版本绑死 */
export type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'thinking'; text?: string; pending?: boolean }
  | { type: 'image'; data: string }
  | { type: 'toolCall'; toolCallId: string; name: string }

export interface AssistantLike {
  content?: ContentBlock[]
  stopReason?: string
  errorMessage?: string
}

export interface DisplayOptions {
  isStreaming?: boolean
}

/**
 * 空 thinking 块不参与显示（流式期间常出现"占位"thinking）。
 * 判据与 pi-web 一致：没有 text 且不是 pending。
 */
function isEmptyThinkingBlock(block: ContentBlock): boolean {
  return block.type === 'thinking' && !block.text?.trim() && !block.pending
}

export function displayableBlocks(
  message: AssistantLike,
  options: DisplayOptions = {},
): ContentBlock[] {
  void options
  return (message.content ?? []).filter((block) => !isEmptyThinkingBlock(block))
}

/** Text / image 是"回答"；thinking 与 toolCall 是"过程"。 */
function isAnswerBlock(block: ContentBlock): boolean {
  return block.type === 'text' || block.type === 'image'
}

/**
 * 按"最后一个非回答块"切分：之后的是最终回答，之前的是过程。
 *
 * 注意 `findLastIndex` 的语义：全无过程块时整条消息都是回答；
 * 全无回答块时回答为空（此时界面上只显示过程 + 错误/截断提示）。
 */
export function splitFinalBlocks(
  message: AssistantLike,
  options: DisplayOptions = {},
): { answerBlocks: ContentBlock[]; processBlocks: ContentBlock[] } {
  const blocks = displayableBlocks(message, options)
  // 用倒序循环而不是 findLastIndex：core 的 lib 目标低于 ES2023
  let lastProcessIndex = -1
  for (let i = blocks.length - 1; i >= 0; i -= 1) {
    const block = blocks[i]
    if (block && !isAnswerBlock(block)) {
      lastProcessIndex = i
      break
    }
  }
  if (lastProcessIndex === -1) return { answerBlocks: blocks, processBlocks: [] }
  return {
    answerBlocks: blocks.slice(lastProcessIndex + 1),
    processBlocks: blocks.slice(0, lastProcessIndex + 1),
  }
}

/**
 * 有回答才允许把"过程"默认折叠。
 *
 * 依据（pi-web #906）：只有错误或截断提示、没有正文时，如果也折叠过程，
 * 用户写在上一次工具调用之前的文字就再也看不到。所以这里只认 text/image。
 */
export function collapsesProcessDetails(answer: AssistantLike | null): boolean {
  return (answer?.content ?? []).some(
    (block) => block.type === 'image' || (block.type === 'text' && block.text.trim().length > 0),
  )
}

export function getAssistantErrorMessage(
  message: AssistantLike,
  options: DisplayOptions = {},
): string | null {
  if (options.isStreaming || message.stopReason !== 'error') return null
  return message.errorMessage?.trim() || 'Unknown provider error'
}

/** 回合以 `length` 结束时输出预算花光了，必须给提示，否则看起来像卡住。 */
export function isAssistantTruncated(
  message: AssistantLike,
  options: DisplayOptions = {},
): boolean {
  return !options.isStreaming && message.stopReason === 'length'
}

/** 是否至少有一个"真回答"（thinking 单独存在不算）。 */
export function hasAssistantAnswer(message: AssistantLike): boolean {
  return (message.content ?? []).some((block) => {
    if (block.type === 'text') return block.text.trim().length > 0
    return block.type === 'image' || block.type === 'toolCall'
  })
}

/**
 * 工具结果按 toolCallId 归位。
 *
 * 为什么要单独一个函数：`toolResult` 是**独立块**（pi SDK 形状），
 * 界面要按 id 把它贴回对应的 `toolCall` 上；直接顺序配对会在
 * "多个工具并行调用、结果乱序返回"时贴错（`MessageView.tsx:274` 同义）。
 */
export function pairToolResults(
  blocks: readonly unknown[],
): Map<string, { text: string; failed: boolean; durationMs?: number }> {
  const map = new Map<string, { text: string; failed: boolean; durationMs?: number }>()
  for (const raw of blocks) {
    const block = raw as {
      type?: string
      toolCallId?: string
      content?: unknown
      isError?: boolean
      /** 结果里记录的耗时（B-029 优先用它，而不是自己掐表） */
      durationMs?: number
    }
    if (block?.type !== 'toolResult' || typeof block.toolCallId !== 'string') continue
    map.set(block.toolCallId, {
      text: textOfResult(block.content),
      failed: Boolean(block.isError),
      durationMs: typeof block.durationMs === 'number' ? block.durationMs : undefined,
    })
  }
  return map
}

/** 结果内容可能是字符串，也可能是 `[{type:'text',text}]`（pi SDK 两种都给过） */
function textOfResult(content: unknown): string {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  return content
    .map((part) => {
      const p = part as { type?: string; text?: string }
      return p?.type === 'text' && typeof p.text === 'string' ? p.text : ''
    })
    .filter(Boolean)
    .join('\n')
}
