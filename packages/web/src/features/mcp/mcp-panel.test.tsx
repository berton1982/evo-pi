// @vitest-environment jsdom
/**
 * T-19 选中项与清单对账：选中项消失时回落到第一条
 * T-20 签到轮询只看最新轮次；卸载不停流程
 * T-21 Code mode 只写变化的字段；旧答案不落库
 * T-22 整页四态：整体失败 / 加载 / 空 / 有数据
 * T-23 容器把 serverKey 归一后上抛，并只取自己那条测试结果
 */

import type { McpServerSummary } from '@evo-pi/core/mcp'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { McpPanel } from '@/features/mcp/mcp-panel'
import { reconcileSelection } from '@/features/mcp/stores/mcp-selection-store'
import { createMcpSignIn } from '@/features/mcp/use-mcp-sign-in'

const t = (key: string) => key
const srv = (name: string, scope: 'user' | 'project' = 'user'): McpServerSummary => ({
  name,
  scope,
  enabled: true,
  transport: 'stdio',
  sourcePath: `/home/me/${name}`,
})

afterEach(cleanup)

describe('T-19 选中项对账', () => {
  it('存在就保留，不存在回落第一条，空清单给 null', () => {
    expect(reconcileSelection('user/a', ['user/a', 'user/b'])).toBe('user/a')
    expect(reconcileSelection('user/gone', ['user/b'])).toBe('user/b')
    expect(reconcileSelection('user/a', [])).toBeNull()
  })
})

describe('T-20 签到轮询', () => {
  it('旧轮次的答案被丢弃；卸载只停轮询不 cancel', async () => {
    const cancel = vi.fn(async () => ({ ok: true }))
    let round = 0
    const flow = {
      begin: vi.fn(async () => ({ ok: true, value: { flowId: 'f1' } })),
      status: vi.fn(async () => {
        round += 1
        return { ok: true, value: { state: 'pending' as const, message: `r${round}` } }
      }),
      submit: vi.fn(),
      cancel,
    }
    const signIn = createMcpSignIn({
      flow,
      cwd: null,
      setTimer: () => 1,
      clearTimer: () => {},
      intervalMs: 1,
    })
    const started = await signIn.start(srv('a'))
    const session = started.value!
    const first = await signIn.pollRound(session)
    expect(first?.round).toBe(1)
    // 用过期的 session（round 仍是 0）再问一次：应当不覆盖已经到 round 1 的当前状态
    const stale = await signIn.pollRound(session)
    expect(stale).toBeUndefined()
    signIn.unmount()
    expect(cancel).not.toHaveBeenCalled()
    await signIn.cancel()
    expect(cancel).toHaveBeenCalledTimes(1)
  })
})

describe('T-22 整页四态', () => {
  const base = {
    servers: [],
    groups: [],
    selectedKey: null,
    testResults: {},
    testRunning: [],
    home: '/home/me',
    root: '/home/me/proj',
    t,
    onSelect: vi.fn(),
    onToggle: vi.fn(),
    onToggleGroup: vi.fn(),
    onTest: vi.fn(),
  }

  it('整体失败 / 加载 / 空 / 有数据', () => {
    const { rerender } = render(
      <McpPanel {...base} loading={false} error={{ code: 'internal', message: 'x' }} />,
    )
    expect(screen.getByTestId('mcp-panel-error')).toBeDefined()
    rerender(<McpPanel {...base} loading error={null} />)
    expect(screen.getByTestId('mcp-panel-loading')).toBeDefined()
    rerender(<McpPanel {...base} loading={false} error={null} />)
    expect(screen.getByTestId('mcp-empty')).toBeDefined()
    rerender(
      <McpPanel
        {...base}
        loading={false}
        error={null}
        servers={[srv('a')]}
        groups={[{ scope: 'user', servers: [srv('a')] }]}
        selectedKey="user/a"
      />,
    )
    expect(screen.getByTestId('mcp-detail-name').textContent).toBe('a')
  })
})

describe('T-23 容器归一', () => {
  it('点击列表把 user/a 这种 key 上抛，并只展示自己的测试结果', () => {
    const onSelect = vi.fn()
    render(
      <McpPanel
        servers={[srv('a'), srv('b')]}
        groups={[{ scope: 'user', servers: [srv('a'), srv('b')] }]}
        selectedKey="user/a"
        testResults={{
          'user/a': { ok: false, error: { code: 'x', timedOut: true } },
          'user/b': { ok: true },
        }}
        testRunning={['user/a']}
        loading={false}
        error={null}
        home="/home/me"
        root="/home/me"
        t={t}
        onSelect={onSelect}
        onToggle={vi.fn()}
        onToggleGroup={vi.fn()}
        onTest={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByText('b'))
    expect(onSelect).toHaveBeenCalledWith('user/b')
    // 选中的是 a，且 a 正在测试 → 状态行显示"跑着"，不会显示 b 的结果
    expect(screen.getByTestId('mcp-test-running')).toBeDefined()
  })
})
