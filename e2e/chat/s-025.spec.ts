import { expect, test } from '@playwright/test'

/** B-025 静态文本块渲染：Markdown 交给 SafeMarkdownBody（GFM：表格/列表/行内代码/链接）
 */
test('T-025 富 markdown 渲染成表格、列表、行内代码与外链', async ({ page }) => {
  await page.goto('/sessions?session=01jclongsession0000000000001&cwd=/home/berton/evo-pi')
  // 按内容定位那一条富文本，而不是 `.last()`：夹具里富文本不在尾部，
  // `.last()` 取到的是普通段落（0 个 li），断言就永远红——这正是这条用例
  // 之前被 fixme 的原因（依赖夹具布局）。
  const md = page.getByTestId('chat-markdown').filter({ hasText: '块分派' }).first()
  await expect(md).toBeVisible()

  // 表格：GFM 语法必须真的成为 <table>，手写解析器只能当纯文本
  await expect(page.getByTestId('chat-markdown-table').first()).toBeVisible()
  await expect(page.getByTestId('chat-markdown-table').first()).toContainText('block-view.tsx')

  // 列表与行内代码
  await expect(md.locator('li')).toHaveCount(3)
  // 行内代码：定位到这一条里的 `ToolCallBlock`（`.first()` 取到的是 `ChatWindow.tsx:1089`）
  await expect(
    md.getByTestId('chat-inline-code').filter({ hasText: 'ToolCallBlock' }).first(),
  ).toHaveText('ToolCallBlock')

  // 外链在新标签打开，且 rel 不再给 opener 权限
  const link = md.getByRole('link', { name: 'pi-web' })
  await expect(link).toHaveAttribute('target', '_blank')
  await expect(link).toHaveAttribute('rel', /noopener/)

  // 围栏代码带语言标记
  await expect(page.getByTestId('chat-code-block').last()).toHaveAttribute('data-language', 'ts')
})
