// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { MarkdownBody } from './markdown-body'

/**
 * T-21/T-22 的判据落在这里：排版从 pi-web `.markdown-body` 移植后，
 * 代码块必须有语言标签与复制按钮（pi-web 聊天正文没有语法高亮，只有外壳）。
 */
// 手工 cleanup：本仓库的 vitest 没开 RTL 的自动清理，否则上一个用例的 DOM 会留在 document 里
afterEach(cleanup)

describe('MarkdownBody', () => {
  it('围栏代码渲染成带语言标签与复制按钮的外壳', () => {
    render(<MarkdownBody text={'```ts\nconst x = 1\n```'} />)
    expect(screen.getByTestId('chat-code-shell')).toBeTruthy()
    expect(screen.getByTestId('chat-code-lang').textContent).toBe('ts')
    expect(screen.getByTestId('chat-code-copy').textContent).toBe('复制')
    expect(screen.getByTestId('chat-code-block').textContent).toContain('const x = 1')
  })

  it('没有语言标注时标签显示 text', () => {
    render(<MarkdownBody text={'```\nplain\n```'} />)
    expect(screen.getByTestId('chat-code-lang').textContent).toBe('text')
  })

  it('行内代码不带外壳，表格可横滚', () => {
    render(<MarkdownBody text={'一段 `inline` 与\n\n| a | b |\n| - | - |\n| 1 | 2 |'} />)
    expect(screen.getByTestId('chat-inline-code').textContent).toBe('inline')
    expect(screen.queryByTestId('chat-code-shell')).toBeNull()
    expect(screen.getByTestId('chat-markdown-table')).toBeTruthy()
  })
})
