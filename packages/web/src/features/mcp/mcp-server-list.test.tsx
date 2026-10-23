// @vitest-environment jsdom
/**
 * T-15 列表：分组渲染、选中、组批量把整组传上去
 */

import type { McpServerSummary } from '@evo-pi/core/mcp'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { McpServerList } from '@/features/mcp/mcp-server-list'

const t = (key: string) => key
const server = (name: string, enabled = true): McpServerSummary => ({
  name,
  scope: 'user',
  enabled,
  transport: 'stdio',
  sourcePath: `/x/${name}`,
})

afterEach(cleanup)

describe('T-15 McpServerList', () => {
  it('渲染两组、点击选中、组按钮上抛整组', () => {
    const onSelect = vi.fn()
    const onToggleGroup = vi.fn()
    const groups = [
      { scope: 'user' as const, servers: [server('u1'), server('u2')] },
      { scope: 'project' as const, servers: [server('p1', false)] },
    ]
    render(
      <McpServerList
        groups={groups}
        selectedKey="user/u1"
        t={t}
        onSelect={onSelect}
        onToggle={vi.fn()}
        onToggleGroup={onToggleGroup}
      />,
    )
    expect(screen.getByTestId('mcp-row-user/u1')).toBeDefined()
    expect(screen.getByTestId('mcp-group-status-user').textContent).toBe('mcp.groupStatus')
    fireEvent.click(screen.getByText('u2'))
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ name: 'u2' }))
    // user 组两条都启用 → 组按钮是"停用"，点击应把两条一起传上去且目标是 false
    fireEvent.click(screen.getByText('mcp.disableGroup'))
    expect(onToggleGroup).toHaveBeenCalledWith(groups[0]?.servers, false)
  })

  it('空清单给空态而不是空白', () => {
    render(
      <McpServerList
        groups={[]}
        selectedKey={null}
        t={t}
        onSelect={vi.fn()}
        onToggle={vi.fn()}
        onToggleGroup={vi.fn()}
      />,
    )
    expect(screen.getByTestId('mcp-empty').textContent).toBe('mcp.empty')
  })
})
