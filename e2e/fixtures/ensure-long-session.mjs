#!/usr/bin/env node
/**
 * 生成"长会话"夹具（幂等，64 条消息，含工具块 / 表格 / 代码块 / 一条错误）。
 *
 * 为什么要有这个脚本：长会话以前同样只存在于 `/tmp`（手工造），丢了以后
 * s-029（工具时长）、s-004（贴底）等 20 条 spec 全红，而红的样子像渲染回归。
 * 断言需要的内容都写在这里：`apply_patch`（durationMs 1500）、无时长的 `bash`、
 * 表格与行内代码（`block-view.tsx` / `ToolCallBlock`）、一段 ```ts 代码块、一条
 * `model "gpt-none" not found` 错误。
 *
 *   node e2e/fixtures/ensure-long-session.mjs [agentDir]
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const agentDir = process.argv[2] ?? process.env.PI_CODING_AGENT_DIR ?? '/tmp/e2e-agent'
const cwd = '/home/berton/evo-pi'
const sessionId = '01jclongsession0000000000001'
const dir = join(agentDir, 'sessions', '--home-berton-evo-pi--')
const file = join(dir, `${sessionId}.jsonl`)
if (existsSync(file)) {
  console.log(`夹具已存在：${file}`)
  process.exit(0)
}
mkdirSync(dir, { recursive: true })

const ts = (s) => new Date(Date.parse('2026-10-20T08:00:00.000Z') + s * 1000).toISOString()
const base = { api: 'fake', provider: 'fake', model: 'fake', usage: { input: 0, output: 0 } }
let id = 0
const msg = (role, content, s, extra = {}) => ({
  type: 'message',
  id: `long-${++id}`,
  parentId: id > 1 ? `long-${id - 1}` : null,
  timestamp: ts(s),
  message: {
    role,
    timestamp: Date.parse(ts(s)),
    content,
    ...(role === 'assistant' ? base : {}),
    ...extra,
  },
})

const richAssistant = msg(
  'assistant',
  [
    { type: 'thinking', thinking: '先看滚动容器怎么拿高度，再看贴底跟随。' },
    {
      type: 'toolCall',
      id: 'c-apply',
      name: 'apply_patch',
      arguments: {
        patch:
          '*** Begin Patch\n*** Update File: packages/web/src/features/chat/block-view.tsx\n' +
          '@@ -10,3 +10,3 @@\n-  return <ToolCallBlock block={block} />\n' +
          '+  return <ToolCallBlock block={block} compact />\n*** End Patch',
      },
    },
    {
      type: 'toolResult',
      id: 'c-apply',
      durationMs: 1500,
      content: [{ type: 'text', text: 'packages/web/src/features/chat/block-view.tsx 已更新' }],
    },
    { type: 'toolCall', id: 'c-bash', name: 'bash', arguments: { command: 'git status' } },
    {
      type: 'toolResult',
      id: 'c-bash',
      content: [{ type: 'text', text: 'fatal: not a git repository' }],
    },
    {
      type: 'text',
      text:
        '滚动容器在 `ChatWindow.tsx:1089`，行内代码写作 `ToolCallBlock`。\n\n' +
        '- 第一条：块分派\n- 第二条：工具渲染\n- 第三条：diff 视图\n\n' +
        '| 文件 | 作用 |\n| --- | --- |\n| block-view.tsx | 块分派 |\n\n' +
        '[参考实现](https://example.com/chat)\n\n' +
        '```ts\nexport function ToolCallBlock() {\n  return null\n}\n```\n',
    },
  ],
  5,
)

const rows = [{ type: 'session', version: 3, id: sessionId, timestamp: ts(0), cwd }]
rows.push(msg('user', [{ type: 'text', text: '第 1 条提问：滚动几何测试' }], 0))
rows.push(richAssistant)
rows.push(msg('assistant', [{ type: 'text', text: 'model "gpt-none" not found' }], 6))
for (let i = 1; i < 30; i += 1) {
  const longText =
    i === 14
      ? `超长提问：${'这是一段很长的提问内容。'.repeat(120)}`
      : `第 ${i + 1} 条提问：填充内容，用于滚动几何。`
  rows.push(msg('user', [{ type: 'text', text: longText }], 10 + i * 10))
  rows.push(
    msg(
      'assistant',
      [{ type: 'text', text: `第 ${i + 1} 条回答：${'填充文本 '.repeat(40)}` }],
      15 + i * 10,
    ),
  )
}

writeFileSync(file, `${rows.map((r) => JSON.stringify(r)).join('\n')}\n`)
console.log(`已写入夹具：${file}（${rows.length} 行）`)
