import { describe, expect, it } from 'vitest'

import {
  type ContentBlock,
  collapsesProcessDetails,
  displayableBlocks,
  getAssistantErrorMessage,
  hasAssistantAnswer,
  isAssistantTruncated,
  pairToolResults,
  splitFinalBlocks,
} from './final-answer'

const text = (t: string): ContentBlock => ({ type: 'text', text: t })
const thinking = (t?: string, pending = false): ContentBlock => ({
  type: 'thinking',
  text: t,
  pending,
})
const toolCall = (id: string): ContentBlock => ({ type: 'toolCall', toolCallId: id, name: 'read' })

describe('T-01 最终回答判定（D-U-03 / B-007）', () => {
  it('最后一个非回答块之后才是最终回答', () => {
    const { answerBlocks, processBlocks } = splitFinalBlocks({
      content: [thinking('想'), toolCall('c1'), text('答案一'), text('答案二')],
    })
    expect(processBlocks).toHaveLength(2)
    expect(answerBlocks.map((b) => (b.type === 'text' ? b.text : b.type))).toEqual([
      '答案一',
      '答案二',
    ])
  })

  it('没有过程块时整条消息都是回答', () => {
    const { answerBlocks, processBlocks } = splitFinalBlocks({ content: [text('只有答案')] })
    expect(processBlocks).toEqual([])
    expect(answerBlocks).toHaveLength(1)
  })

  it('只有过程块时回答为空（错误/截断提示靠在它旁边显示）', () => {
    const { answerBlocks } = splitFinalBlocks({ content: [thinking('想'), toolCall('c1')] })
    expect(answerBlocks).toEqual([])
  })

  it('空 thinking 块不参与显示，pending thinking 保留', () => {
    const blocks = displayableBlocks({
      content: [thinking('   '), thinking(undefined, true), text('x')],
    })
    expect(blocks).toHaveLength(2)
  })

  it('只有错误/截断提示时不折叠过程（否则正文会被藏起来）', () => {
    expect(collapsesProcessDetails({ content: [text('  ')] })).toBe(false)
    expect(collapsesProcessDetails({ content: [thinking('想')] })).toBe(false)
    expect(collapsesProcessDetails(null)).toBe(false)
    expect(collapsesProcessDetails({ content: [text('答案')] })).toBe(true)
  })

  it('错误信息只在非流式且 stopReason=error 时给，缺文案兜底', () => {
    expect(getAssistantErrorMessage({ stopReason: 'error' }, { isStreaming: true })).toBeNull()
    expect(getAssistantErrorMessage({ stopReason: 'end' })).toBeNull()
    expect(getAssistantErrorMessage({ stopReason: 'error' })).toBe('Unknown provider error')
    expect(getAssistantErrorMessage({ stopReason: 'error', errorMessage: ' 429 ' })).toBe('429')
  })

  it('length 截断只在结束后提示；thinking 单独存在不算"有回答"', () => {
    expect(isAssistantTruncated({ stopReason: 'length' }, { isStreaming: true })).toBe(false)
    expect(isAssistantTruncated({ stopReason: 'length' })).toBe(true)
    expect(hasAssistantAnswer({ content: [thinking('想')] })).toBe(false)
    expect(hasAssistantAnswer({ content: [toolCall('c1')] })).toBe(true)
    expect(hasAssistantAnswer({ content: [text('  ')] })).toBe(false)
  })
})

describe('pairToolResults', () => {
  it('按 toolCallId 归位，乱序结果也贴得准', () => {
    const map = pairToolResults([
      { type: 'toolResult', toolCallId: 'b', content: [{ type: 'text', text: 'B' }] },
      { type: 'toolResult', toolCallId: 'a', content: 'A' },
      { type: 'text', text: '忽略我' },
    ])
    expect(map.get('a')?.text).toBe('A')
    expect(map.get('b')?.text).toBe('B')
  })

  it('isError 记为失败，缺内容时给空串而不是 undefined', () => {
    const map = pairToolResults([{ type: 'toolResult', toolCallId: 'x', isError: true }])
    expect(map.get('x')).toEqual({ text: '', failed: true })
  })
})
