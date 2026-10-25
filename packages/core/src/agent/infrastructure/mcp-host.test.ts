import { describe, expect, it } from 'vitest'
import { createPollingMcpRuntime } from '../adapters/mcp-runtime'
import { createMcpHost } from './mcp-host'

/** T-05 */
describe('MCP Host（T-05 准备与降级）', () => {
  it('全部就绪时 ready 齐全、degraded 为空', async () => {
    const host = createMcpHost({
      servers: [
        { name: 'alpha', start: async () => ({ ok: true }) },
        { name: 'gamma', start: async () => ({ ok: true }) },
      ],
    })
    expect(await host.prepare()).toEqual({ ready: ['alpha', 'gamma'], degraded: [] })
  })

  it('单个 server 失败只降级，不阻断其它 server', async () => {
    const host = createMcpHost({
      servers: [
        { name: 'alpha', start: async () => ({ ok: true }) },
        { name: 'beta', start: async () => ({ ok: false, reason: '连接被拒' }) },
      ],
    })
    const state = await host.prepare()
    expect(state.ready).toEqual(['alpha'])
    expect(state.degraded).toEqual([{ name: 'beta', reason: '连接被拒' }])
  })

  it('start 抛错也被收进 degraded（不冒泡）', async () => {
    const host = createMcpHost({
      servers: [
        {
          name: 'boom',
          start: async () => {
            throw new Error('spawn ENOENT')
          },
        },
      ],
    })
    const state = await host.prepare()
    expect(state.ready).toEqual([])
    expect(state.degraded[0]?.reason).toContain('ENOENT')
  })
})

/** T-06 */
describe('MCP 运行时监视（T-06 只推变化）', () => {
  it('状态不变时不重复回调', async () => {
    let calls = 0
    const runtime = createPollingMcpRuntime({
      prepare: async () => ({ ready: ['alpha'], degraded: [] }),
      intervalMs: 5,
    })
    const stop = runtime.watch(() => {
      calls += 1
    })
    await new Promise((r) => setTimeout(r, 40))
    stop()
    expect(calls).toBe(1)
  })
})
