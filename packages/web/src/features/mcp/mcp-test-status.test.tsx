// @vitest-environment jsdom
/**
 * T-16 测试结果三态：跑着 / 通过 / 超时
 * T-17 详情显示缩写路径，测试中按钮禁用
 */

import type { McpServerSummary } from '@evo-pi/core/mcp'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { McpServerDetail } from '@/features/mcp/mcp-server-detail'
import { McpTestStatus } from '@/features/mcp/mcp-test-status'

const t = (key: string) => key
const server: McpServerSummary = {
  name: 'ctx7',
  scope: 'user',
  enabled: true,
  transport: 'stdio',
  sourcePath: '/home/me/proj/.mcp.json',
}

afterEach(cleanup)

describe('T-16 McpTestStatus', () => {
  it('三态互斥', () => {
    const { rerender } = render(<McpTestStatus running t={t} />)
    expect(screen.getByTestId('mcp-test-running')).toBeDefined()
    rerender(<McpTestStatus running={false} result={{ ok: true, tools: ['a', 'b'] }} t={t} />)
    expect(screen.getByTestId('mcp-test-ok').textContent).toBe('mcp.test.ok')
    rerender(
      <McpTestStatus
        running={false}
        result={{ ok: false, error: { code: 'x', timedOut: true } }}
        t={t}
      />,
    )
    expect(screen.getByTestId('mcp-test-fail').textContent).toBe('mcp.failure.timeout')
  })
})

describe('T-17 McpServerDetail', () => {
  it('项目内路径缩成相对路径；测试中禁用按钮', () => {
    const onTest = vi.fn()
    const { rerender } = render(
      <McpServerDetail
        server={server}
        running={false}
        home="/home/me"
        root="/home/me/proj"
        t={t}
        onTest={onTest}
      />,
    )
    expect(screen.getByTestId('mcp-detail-path').textContent).toBe('.mcp.json')
    fireEvent.click(screen.getByText('mcp.test.button'))
    expect(onTest).toHaveBeenCalledWith(server)
    rerender(
      <McpServerDetail
        server={server}
        running
        home="/home/me"
        root="/home/me/proj"
        t={t}
        onTest={onTest}
      />,
    )
    expect((screen.getByText('mcp.test.button') as HTMLButtonElement).disabled).toBe(true)
  })
})
