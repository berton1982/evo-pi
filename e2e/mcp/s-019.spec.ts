/**
 * B-019 组批量。 组头按钮切换整组
 *
组头按钮把整组切到与当前相反的状态，真实写盘。
 */

import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { openMcpPanel, resetMcpFixture } from './fixture'

test.beforeEach(() => {
  resetMcpFixture()
})

test('T-14 组头按钮切换整组', async ({ page }) => {
  await openMcpPanel(page)
  const group = page.getByTestId('mcp-group-user')
  // 组头是 role=switch（aria-checked 表达当前态），不是普通按钮
  await group.getByRole('switch').first().click()
  // 直接看落盘结果：组批量是"写文件"，不是"改内存"——读文件才是判据
  await expect
    .poll(
      async () => {
        const raw = JSON.parse(
          readFileSync(`${process.env.PI_CODING_AGENT_DIR ?? '/tmp/e2e-agent'}/mcp.json`, 'utf8'),
        ) as {
          mcpServers: Record<string, { disabled?: boolean }>
        }
        return Object.values(raw.mcpServers).every((s) => s.disabled === true)
      },
      { timeout: 20_000 },
    )
    .toBe(true)
  await expect(group.getByRole('switch').first()).not.toBeChecked()
})
