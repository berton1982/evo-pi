#!/usr/bin/env node
/**
 * 生成 e2e 用的会话夹具（幂等）。
 *
 * 为什么要有这个脚本：夹具以前只存在于 `/tmp/e2e-agent`（一次性手工写入），
 * `/tmp` 被清理后 9 条 chat e2e 全部变红（报 `element(s) not found`），
 * 而"红的原因"看起来像代码回归。夹具必须是可重建的仓库资产：
 *
 *   node e2e/fixtures/ensure-chat-session.mjs [agentDir]
 *
 * 写入 `sessions/--home-berton-evo-pi-packages-web--/01jcchatfixture0000000000001.jsonl`，
 * 不含任何用户真实会话内容。
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const agentDir = process.argv[2] ?? process.env.PI_CODING_AGENT_DIR ?? '/tmp/e2e-agent'
const cwd = '/home/berton/evo-pi/packages/web'
const sessionId = '01jcchatfixture0000000000001'
const dir = join(agentDir, 'sessions', '--home-berton-evo-pi-packages-web--')
const file = join(dir, `${sessionId}.jsonl`)
if (existsSync(file)) {
  console.log(`夹具已存在：${file}`)
  process.exit(0)
}
mkdirSync(dir, { recursive: true })

const lines = [
  {
    type: 'session',
    version: 3,
    id: sessionId,
    timestamp: '2026-10-20T08:00:00.000Z',
    cwd,
  },
  {
    type: 'message',
    id: 'chat-user-0',
    parentId: null,
    timestamp: '2026-10-20T08:00:00.000Z',
    message: {
      role: 'user',
      content: [{ type: 'text', text: 'MCP 列表怎么分组？' }],
      timestamp: Date.parse('2026-10-20T08:00:00.000Z'),
    },
  },
  {
    type: 'message',
    id: 'chat-asst-0',
    parentId: 'chat-user-0',
    timestamp: '2026-10-20T08:00:02.000Z',
    message: {
      role: 'assistant',
      timestamp: Date.parse('2026-10-20T08:00:02.000Z'),
      // 会话读的 zod 契约要求 assistant 行带模型信息（pi SDK 真实行里也有）
      api: 'fake',
      provider: 'fake',
      model: 'fake',
      usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0 },
      content: [
        { type: 'thinking', thinking: '先看 groups 的排序规则，再确认 user 与 project 的先后。' },
        {
          type: 'toolCall',
          id: 'c1',
          name: 'read_file',
          arguments: { path: 'packages/web/src/features/mcp/mcp-server-list.tsx' },
        },
        {
          type: 'toolResult',
          id: 'c1',
          durationMs: 1500,
          content: [{ type: 'text', text: '151 行' }],
        },
        {
          type: 'text',
          text: 'MCP 列表已经按 user/project 分组，组内按名字排序，组头显示该组的开关状态。\n\n| 作用域 | 来源 |\n| --- | --- |\n| user | 全局配置文件 |\n| project | 工作目录下的配置 |\n',
        },
      ],
    },
  },
]
writeFileSync(file, `${lines.map((l) => JSON.stringify(l)).join('\n')}\n`)
console.log(`已写入夹具：${file}`)
