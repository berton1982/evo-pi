// @vitest-environment jsdom
/**
 * Sidebar 壳的测试（只测壳的职责）。
 *
 * 会话树/文件树的行为测试在 `features/**` 各自目录里——
 * 壳一旦替能力断言内容，壳就又变成"什么都知道的那个组件"。
 */

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '@/shell/frame/i18n-provider'
import { Sidebar } from '@/shell/layout/sidebar-pane'

function renderSidebar(onSearchToggle = vi.fn()): {
  onSearchToggle: ReturnType<typeof vi.fn>
} {
  render(
    <I18nProvider>
      <Sidebar
        onSearchToggle={onSearchToggle}
        cwd="/repo"
        onPickProject={() => {}}
        onNew={() => {}}
        tabs={{
          sessions: <div data-testid="sessions-slot">sessions</div>,
          files: <div data-testid="files-slot">files</div>,
        }}
      />
    </I18nProvider>,
  )
  return { onSearchToggle }
}

// vitest 未开 globals 时 Testing Library 不会自动 cleanup：
// 上一个用例的 DOM 会留在 document 里，querySelector 命中别人的按钮
afterEach(() => {
  cleanup()
})

describe('Sidebar（壳）', () => {
  it('默认显示会话标签，切到文件标签后只显示文件槽位', async () => {
    renderSidebar()
    expect(screen.getByTestId('sessions-slot')).toBeInTheDocument()
    expect(screen.queryByTestId('files-slot')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('tab', { name: /files/i }))
    expect(screen.getByTestId('files-slot')).toBeInTheDocument()
    expect(screen.queryByTestId('sessions-slot')).not.toBeInTheDocument()
  })

  it('渲染覆盖层容器（菜单与 toast 由壳提供）', () => {
    renderSidebar()
    expect(document.querySelector('[data-component="sidebar"]')).toBeTruthy()
  })

  it('把搜索按钮的点击转达给上层（壳不自己存开合状态）', async () => {
    const { onSearchToggle } = renderSidebar()
    // 用 data-action 定位：侧栏里还有新建等图标按钮，按名字会撞
    const toggle = document.querySelector('[data-action="search-toggle"]') as HTMLElement
    await userEvent.click(toggle)
    await userEvent.click(toggle)
    expect(onSearchToggle).toHaveBeenCalledTimes(2)
  })
})
