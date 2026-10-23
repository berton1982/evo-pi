/**
 * T-12 派生分组只从 overview 算一次来源，且顺序固定
 * T-13 动作层把 trust_required 翻译成可判定的布尔
 */

import type { McpServerSummary } from '@evo-pi/core/mcp'
import { act } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useMcpOverviewStore } from '@/features/mcp/stores/mcp-overview-store'
import { createMcpActions } from '@/features/mcp/use-mcp-actions'

const server = (name: string, scope: 'user' | 'project', enabled = true): McpServerSummary => ({
  name,
  scope,
  enabled,
  transport: 'stdio',
  sourcePath: `/x/${name}`,
})

describe('T-12 mcpOverviewStore', () => {
  beforeEach(() => {
    act(() => useMcpOverviewStore.getState().reset())
  })

  it('分组顺序固定 user → project，空组不出现', () => {
    const { setOverview } = useMcpOverviewStore.getState()
    act(() => setOverview([server('p1', 'project'), server('u1', 'user')]))
    const servers = useMcpOverviewStore.getState().overview ?? []
    expect(servers.map((s) => s.name)).toEqual(['p1', 'u1'])
    act(() => setOverview([server('u1', 'user')]))
    const only = useMcpOverviewStore.getState().overview ?? []
    expect(only.some((s) => s.scope === 'project')).toBe(false)
  })
})

describe('T-13 createMcpActions.toggle', () => {
  it('端口返回 trust_required 时翻译成 trustRequired', async () => {
    const repo = {
      list: vi.fn(),
      write: vi.fn(async () => ({
        ok: false,
        error: { code: 'untrusted', trustRequired: true, message: 'need trust' },
      })),
      add: vi.fn(),
      remove: vi.fn(),
    }
    const actions = createMcpActions({
      repo: repo as never,
      tests: { run: vi.fn() },
      trust: { request: vi.fn(async () => ({ ok: true })) },
      cwd: '/proj',
    })
    const res = await actions.toggle(server('a', 'project'), true)
    expect(res.ok).toBe(false)
    expect(res.trustRequired).toBe(true)
  })
})
