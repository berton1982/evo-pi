import { expect, test } from '@playwright/test'

/**
 * B-003 首屏贴底；用户上滚后不再自动贴底。
 *
 * 对齐依据：`ref_projects/pi-web/components/ChatWindow.tsx:1089`（消息列表是唯一滚动容器）
 * 与 `packages/web/src/features/chat/domain/chat-scroll.ts` 的贴尾容差 24px。
 * 夹具用 65 行的长会话（`01jclongsession…`），实测 `scrollHeight 7536 > clientHeight 808`。
 */
test('T-003 首屏停在底部，上滚后脱离贴尾', async ({ page }) => {
  // 同一 worker 里别的用例可能留下滚动/会话记忆（B-005 会按上次位置恢复），
  // 先清干净，否则"首屏"测的其实是上一条用例留下的位置。
  await page.addInitScript(() => {
    window.sessionStorage.clear()
    window.localStorage.clear()
  })
  await page.goto('/sessions?session=01jclongsession0000000000001&cwd=/home/berton/evo-pi')
  const list = page.getByTestId('chat-scroll')
  await expect(list).toBeVisible()

  // 消息是分页加载的：先等"最终贴底"（轮询到稳定），而不是量第一帧
  await expect
    .poll(async () => list.evaluate((el) => el.scrollHeight - el.scrollTop - el.clientHeight), {
      timeout: 5000,
    })
    .toBeLessThanOrEqual(24)
  const overflow = await list.evaluate((el) => el.scrollHeight - el.clientHeight)
  expect(overflow).toBeGreaterThan(200) // 真能滚，否则下面的断言没有意义

  await list.evaluate((el) => {
    el.scrollTop = 0
    el.dispatchEvent(new Event('scroll'))
  })
  await page.waitForTimeout(150)
  const after = await list.evaluate((el) => ({
    top: el.scrollTop,
    fromTail: el.scrollHeight - el.scrollTop - el.clientHeight,
  }))
  expect(after.top).toBe(0)
  expect(after.fromTail).toBeGreaterThan(24)
})
