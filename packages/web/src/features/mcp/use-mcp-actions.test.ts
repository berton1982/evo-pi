/**
 * T-14 组批量：部分成功只改成功的那些，失败的逐条记账
 * T-18 加载：后到的旧响应被丢弃（返回 undefined）
 */

import type { McpServerSummary } from '@evo-pi/core/mcp'
import { describe, expect, it, vi } from 'vitest'
import { createMcpActions } from '@/features/mcp/use-mcp-actions'
import { createMcpOverview } from '@/features/mcp/use-mcp-overview'

const server = (name: string, enabled = true): McpServerSummary => ({
  name,
  scope: 'user',
  enabled,
  transport: 'stdio',
  sourcePath: `/x/${name}`,
})

describe('T-14 组批量部分成功', () => {
  it('只把成功的 key 算进 changed', async () => {
    const write = vi.fn(async (ref: { name: string }) => {
      if (ref.name === 'bad') return { ok: false, error: { code: 'internal', message: 'boom' } }
      return { ok: true }
    })
    const actions = createMcpActions({
      repo: { list: vi.fn(), write, add: vi.fn(), remove: vi.fn() } as never,
      tests: { run: vi.fn() },
      trust: { request: vi.fn(async () => ({ ok: true })) },
      cwd: null,
    })
    const res = await actions.toggleGroup([server('good', false), server('bad', false)], true)
    expect(res.ok).toBe(false)
    expect(res.changed).toEqual(['user/good'])
    expect(res.failedKeys).toEqual(['user/bad'])
    expect(write).toHaveBeenCalledTimes(2)
  })
})

describe('T-18 加载旧响应丢弃', () => {
  it('被后到请求取代时返回 undefined', async () => {
    let call = 0
    const list = vi.fn(async () => {
      call += 1
      const mine = call
      await new Promise((r) => setTimeout(r, mine === 1 ? 20 : 1))
      return { ok: true, value: [{ name: `s${mine}` }] }
    })
    const overview = createMcpOverview({ repo: { list } as never, cwd: null })
    const first = overview.refresh()
    const second = overview.refresh()
    expect(await first).toBeUndefined()
    const secondResult = await second
    expect(secondResult?.ok).toBe(true)
  })
})
