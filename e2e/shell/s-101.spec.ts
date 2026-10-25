/**
 * 壳用例级基线（B 部分）：不追求覆盖面，只把"壳的基本行为"钉成可重复执行的东西。
 *
 * 为什么要有这一层：保真快照能说明"少了什么"，但说明不了"已有的还能不能用"——
 * 结构对上了、行为坏了，快照照样 100%。这里用真实浏览器点一遍。
 */
import { expect, test } from '@playwright/test'

const PROJ = process.env.EVO_PI_E2E_PROJ ?? '/home/berton/evo-pi/.parity-proj'

// Playwright 默认 locale 是 en-US，界面走英文；文案断言一律写双语正则。
// （C-G 时踩过：`/测试/` 在 en-US 下永远不匹配，红了半天才发现是语言不是功能。）
const RE_SETTINGS = /(Settings|设置)/
const RE_NEW = /(New chat|新建)/
const RE_FULL_WIDTH = /(full width|全宽)/
// 精确到「隐藏/显示 + 文件面板」整名：写成 /(file panel|文件面板)/ 会把
// 「Show file panel full width」也命中（全宽那个按钮），strict mode 直接炸。
const RE_HIDE_FILES = /^(Hide|Show) file panel$|^(隐藏|显示)文件面板$/

test('S-101 Esc 关闭设置弹窗', async ({ page }) => {
  await page.goto(`/?cwd=${encodeURIComponent(PROJ)}`)
  await page.getByRole('button', { name: RE_SETTINGS }).first().click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
})

test('S-102 顶栏"新建"把 session 写进 URL', async ({ page }) => {
  await page.goto(`/?cwd=${encodeURIComponent(PROJ)}`)
  const url0 = page.url()
  await page.getByRole('button', { name: RE_NEW }).first().click()
  await expect(page).not.toHaveURL(url0)
  await expect(page).toHaveURL(/session=/)
})

test('S-103 文件面板按钮常驻：全宽 + 隐藏都能点到', async ({ page }) => {
  await page.goto(`/?cwd=${encodeURIComponent(PROJ)}`)
  await expect(page.getByRole('button', { name: RE_FULL_WIDTH })).toBeVisible()
  await expect(page.getByRole('button', { name: RE_HIDE_FILES })).toBeVisible()
})
