import { describe, expect, it } from 'vitest'
import { toChatMessages } from './use-session-messages'

describe('toChatMessages', () => {
  it('只保留 user/assistant，其它角色（toolResult 等）跳过', () => {
    const mapped = toChatMessages([
      { id: 'm1', role: 'user', blocks: [{ type: 'text', text: '你好' }] },
      { id: 'm2', role: 'toolResult', blocks: [] },
      { id: 'm3', role: 'assistant', blocks: [{ type: 'text', text: '在' }], timestamp: 5 },
    ])
    expect(mapped.map((m) => m.id)).toEqual(['m1', 'm3'])
    expect(mapped.at(1)?.ts).toBe(5)
  })

  it('blocks 缺失时给空数组，不让渲染层读到 undefined', () => {
    expect(toChatMessages([{ id: 'x', role: 'user' }]).at(0)?.blocks).toEqual([])
  })

  it('会话条目用 content 而不是 blocks 时也要能映射（pi SDK 形状）', () => {
    const mapped = toChatMessages([
      { id: 'c1', role: 'assistant', content: [{ type: 'text', text: '在' }] },
    ])
    expect(mapped.at(0)?.blocks).toHaveLength(1)
  })

  it('缺 id 时按序号补，避免同 key 覆盖', () => {
    const mapped = toChatMessages([{ role: 'user' }, { role: 'user' }])
    expect(mapped.map((m) => m.id)).toEqual(['user-0', 'user-1'])
  })
})
