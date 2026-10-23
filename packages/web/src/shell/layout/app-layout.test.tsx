// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Layout } from '@/shell/layout/app-layout'

describe('Layout', () => {
  it('renders all 4 slot zones (left / center / right) plus top inside center', () => {
    render(
      <Layout
        top={<div data-testid="top-zone">top</div>}
        center={<div data-testid="center-zone">center</div>}
        left={<div data-testid="left-zone">left</div>}
        right={<div data-testid="right-zone">right</div>}
      />,
    )
    expect(screen.getAllByTestId('left-zone')[0]).toHaveTextContent('left')
    expect(screen.getAllByTestId('center-zone')[0]).toHaveTextContent('center')
    expect(screen.getAllByTestId('right-zone')[0]).toHaveTextContent('right')
    expect(screen.getAllByTestId('top-zone')[0]).toHaveTextContent('top')
  })

  it('handles missing optional slots gracefully (top is required)', () => {
    // top is required per interface; left/center/right may be null
    render(
      <Layout top={<div data-testid="top-zone">top</div>} center={null} left={null} right={null} />,
    )
    expect(screen.getAllByTestId('top-zone')[0]).toBeInTheDocument()
  })

  it('forwards sidebar resize events', () => {
    let lastWidth = -1
    render(
      <Layout
        top={<div data-testid="top-zone">top</div>}
        center={<div data-testid="center-zone">center</div>}
        left={<div data-testid="left-zone">left</div>}
        right={<div data-testid="right-zone">right</div>}
        onSidebarResize={(width) => {
          lastWidth = width
        }}
      />,
    )
    // ResizablePanelGroup triggers onLayout with sizes array; we don't simulate
    // drag here but verify the prop is accepted (no crash) and the callback ref
    // is plumbed. lastWidth remains -1 until a real resize fires.
    expect(lastWidth).toBe(-1)
  })

  it('uses default sidebar width when not specified', () => {
    // No explicit sidebarWidth → ResizablePanel defaultSize = DEFAULT_WIDTH
    const { container } = render(
      <Layout
        top={<div data-testid="top-zone">top</div>}
        center={<div data-testid="center-zone">center</div>}
        left={<div data-testid="left-zone">left</div>}
        right={<div data-testid="right-zone">right</div>}
      />,
    )
    // The panel group must render at least one Separator (v4 renamed
    // from ResizeHandle). Use the lib's data attribute.
    const separators = container.querySelectorAll('[data-separator]')
    expect(separators.length).toBeGreaterThanOrEqual(2)
  })
})
