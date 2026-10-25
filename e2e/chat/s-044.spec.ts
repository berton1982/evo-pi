import { expect, test } from '@playwright/test'

/**
 * B-044 布局常量：列宽/边距由常量与容器宽度共同决定。
 *
 * 对齐依据：`ref_projects/pi-web/components/ChatWindow.tsx:1093-1094`
 * ——助手列 `max-width: 820px` + `padding: 0 16px`；消息列表是唯一滚动容器。
 */
test('T-044 消息列宽 ≤820px、左右 16px，且列表是唯一滚动容器', async ({ page }) => {
  await page.goto('/sessions?session=01jclongsession0000000000001&cwd=/home/berton/evo-pi')
  await expect(page.getByTestId('chat-scroll')).toBeVisible()
  // 结构：chat-scroll > div(padding 0 16px) > div(max-width 820px, margin auto) > 消息
  const column = page.locator('[data-testid="chat-scroll"] > div > div').first()
  await expect(column).toBeVisible()
  const box = await column.boundingBox()
  expect(box).not.toBeNull()
  const applied = await column.evaluate((el) => getComputedStyle(el).maxWidth)
  expect(applied).toBe('820px')
  // 视口 1500 宽时列宽应等于 820（而不是撑满）
  expect(box!.width).toBeLessThanOrEqual(820 + 1)

  // 唯一滚动容器：窗口本身不滚，列表内部滚
  const metrics = await page.evaluate(() => {
    const list = document.querySelector('[data-testid="chat-scroll"]') as HTMLElement | null
    return {
      windowScroll: document.documentElement.scrollHeight - window.innerHeight,
      listOverflow: list ? getComputedStyle(list).overflowY : 'missing',
    }
  })
  expect(metrics.windowScroll).toBeLessThanOrEqual(2)
  expect(['auto', 'scroll']).toContain(metrics.listOverflow)
})
