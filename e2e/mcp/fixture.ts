/**
 * e2e 夹具复位：每个用例开始前把两份 MCP 配置写回"全启用"。
 *
 * 为什么要复位：开关用例会真实写盘（`PI_CODING_AGENT_DIR` 指向 /tmp/e2e-agent），
 * 前一个用例把 server 停用后，后一个用例连"测试"按钮都点不到——顺序耦合的用例集等于不可信。
 */

import { mkdirSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

const AGENT_DIR = process.env.PI_CODING_AGENT_DIR ?? '/tmp/e2e-agent'
const PROJ = process.env.EVO_PI_E2E_PROJ ?? '/tmp/e2e-proj'
const STUB = process.env.EVO_PI_E2E_STUB ?? '/home/berton/evo-pi/e2e/fixtures/mcp-stub-server.mjs'

export function resetMcpFixture(): void {
  const user = {
    mcpServers: {
      alpha: { command: 'node', args: [STUB], description: 'stdio 测试服务器' },
      beta: { url: 'http://127.0.0.1:9/mcp', description: 'http 服务器（不可达，用于失败态）' },
    },
  }
  const project = { mcpServers: { gamma: { command: 'node', args: [STUB] } } }
  for (const [path, body] of [
    [`${AGENT_DIR}/mcp.json`, user],
    [`${PROJ}/.pi/mcp.json`, project],
  ] as const) {
    mkdirSync(dirname(path), { recursive: true })
    // 先写临时文件再 rename：服务端随时可能读这两份文件，直接覆盖会让它读到半截 JSON，
    // 表现为"项目级分组偶尔消失"——用例间不稳定的最常见来源
    const tmp = `${path}.tmp`
    writeFileSync(tmp, `${JSON.stringify(body, null, 2)}\n`)
    renameSync(tmp, path)
  }
}

export const PROJ_DIR = PROJ

/**
 * 打开设置弹窗并切到 MCP 分区。
 *
 * 为什么不是 goto('/settings/mcp')：pi-web 的设置是 AppShell 内的弹窗（面板），不是路由。
 * 迁移后如果单独留一条路由，e2e 会"通过"一个用户永远不会走到的界面。
 */
export async function openMcpPanel(page: Page, projDir: string = PROJ): Promise<void> {
  await page.goto(`/sessions?cwd=${encodeURIComponent(projDir)}`)
  await page.locator('[data-component="sidebar-footer"] [data-section="settings"]').click()
  await page.locator('[data-section="mcp"]').click()
  await expect(page.getByTestId('mcp-server-list')).toBeVisible()
}
