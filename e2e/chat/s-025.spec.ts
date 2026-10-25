import { expect, test } from '@playwright/test'

/** B-025 静态文本块渲染：Markdown 交给 SafeMarkdownBody（GFM：表格/列表/行内代码/链接）
 * 夹具尾部内容契约尚未固化：这些断言依赖长会话夹具里"富文本/工具块/错误消息"的精确位置，
 * 而该夹具是可重建的生成物（`e2e/fixtures/ensure-long-session.mjs`）。下一步先把断言
 * 需要的内容写进生成器（或反过来按生成器调整断言），再解除 fixme——
 * 在两者对齐之前保持 fixme，避免"看起来在测、其实测的是夹具布局"。
 */
test.fixme('T-025 富 markdown 渲染成表格、列表、行内代码与外链', async ({ page }) => {
  await page.goto('/sessions?session=01jclongsession0000000000001&cwd=/home/berton/evo-pi')
  const md = page.getByTestId('chat-markdown').last()
  await expect(md).toBeVisible()

  // 表格：GFM 语法必须真的成为 <table>，手写解析器只能当纯文本
  await expect(page.getByTestId('chat-markdown-table').first()).toBeVisible()
  await expect(page.getByTestId('chat-markdown-table').first()).toContainText('block-view.tsx')

  // 列表与行内代码
  await expect(md.locator('li')).toHaveCount(3)
  await expect(page.getByTestId('chat-inline-code').first()).toHaveText(
    /remark-gfm|block-view\.tsx/,
  )

  // 外链在新标签打开，且 rel 不再给 opener 权限
  const link = md.getByRole('link', { name: 'pi-web' })
  await expect(link).toHaveAttribute('target', '_blank')
  await expect(link).toHaveAttribute('rel', /noopener/)

  // 围栏代码带语言标记
  await expect(page.getByTestId('chat-code-block').last()).toHaveAttribute('data-language', 'ts')
})
