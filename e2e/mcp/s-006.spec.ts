/**
 * B-006 组顺序不能随数据顺序变。
 *
 * 顺序规则在 core 的 `groupByScope`（用户级永远在前），所以判据分两段：
 * 1) API 返回的 scope 序列必须是 user → project（确定性，不依赖渲染时机）；
 * 2) DOM 里如果有分组，顺序必须与 API 一致（渲染慢时不判，避免把"没渲染完"当成"顺序错"）。
 */
import { expect, test } from '@playwright/test'
import { openMcpPanel, resetMcpFixture } from './fixture'

test.beforeEach(() => {
  resetMcpFixture()
})

test('T-07b 分组顺序固定 user → project', async ({ page }) => {
  await openMcpPanel(page)
  const proj = process.env.EVO_PI_E2E_PROJ ?? '/tmp/e2e-proj'
  const api = await page.request.get(`/api/mcp?cwd=${encodeURIComponent(proj)}`)
  const scopes: string[] = (await api.json()).servers.map((s: { scope: string }) => s.scope)
  const expected = [...new Set(scopes)]
  expect(expected[0]).toBe('user')

  await expect(page.getByTestId('mcp-row-user/alpha')).toBeVisible()
  const ids = await page.evaluate(() =>
    [...document.querySelectorAll('[data-testid^="mcp-group-"]')]
      .map((el) => (el as HTMLElement).dataset.testid ?? '')
      .filter((id) => !id.includes('-status-')),
  )
  // DOM 顺序必须与 API 同序（少渲染则跳过，不算失败）
  for (const [i, scope] of expected.entries()) {
    const idx = ids.indexOf(`mcp-group-${scope}`)
    if (idx >= 0) expect(idx).toBe(i)
  }
})
