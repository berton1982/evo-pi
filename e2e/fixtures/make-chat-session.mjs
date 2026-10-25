#!/usr/bin/env node
/**
 * 生成"长会话"夹具：滚动几何、时间戳分组、长消息折叠这些行为只能在
 * 真的有溢出、有跨分钟/跨天时间、有超长正文时才算验证过。
 *
 * 用法：node e2e/fixtures/make-chat-session.mjs [--agent-dir /tmp/e2e-agent] [--cwd <项目目录>]
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import { join, resolve } from 'node:path'

const args = process.argv.slice(2)
const argOf = (name, fallback) => {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : fallback
}
const agentDir = resolve(argOf('--agent-dir', process.env.PI_CODING_AGENT_DIR ?? '/tmp/e2e-agent'))
const cwd = resolve(argOf('--cwd', process.cwd()))
export const LONG_SESSION_ID = '01jclongsession0000000000001'
/**
 * 从本机 agent 目录拷一条真实会话当夹具。
 *
 * **默认关闭**：夹具会随快照沉淀进仓库，真实会话里是用户自己的对话内容。
 * 需要时显式传 `--from <dir>`，并且只在临时目录里用、不要提交。
 */
const REAL_SESSION_SOURCE = argOf('--from', '')

const countLines = (path) => readFileSync(path, 'utf8').split('\n').length
const dirName = `--${cwd.replace(/^\/+/, '').replace(/[^A-Za-z0-9]+/g, '-')}--`
const dir = join(agentDir, 'sessions', dirName)
mkdirSync(dir, { recursive: true })

const longText = `${'这是一段很长的用户消息，用来验证气泡最大高度与展开。'.repeat(30)}`
const codeText = ['```ts', 'export function ping(): string {', "  return 'pong'", '}', '```'].join(
  '\n',
)

const messages = []
const base = Date.parse('2026-10-20T08:00:00Z')
for (let i = 0; i < 30; i += 1) {
  // 第 3、4 条放进同一分钟：验证"相邻同分钟不重复显示"（B-037）
  const minute = i === 3 ? 6 : i * 3
  messages.push({
    type: 'message',
    id: `long-user-${i}`,
    parentId: i === 0 ? null : `long-asst-${i - 1}`,
    timestamp: new Date(base + minute * 60_000).toISOString(),
    message: {
      role: 'user',
      // 第 30 条做成超长提问：验证气泡限高与「展开全文」（B-033）
      content: [
        {
          type: 'text',
          text:
            i === 29 ? `第 ${i + 1} 条超长提问：${longText}` : `第 ${i + 1} 条提问：滚动几何测试`,
        },
      ],
      timestamp: minute,
    },
  })
  messages.push({
    type: 'message',
    id: `long-asst-${i}`,
    parentId: `long-user-${i}`,
    timestamp: new Date(base + minute * 60_000 + 30_000).toISOString(),
    message: {
      role: 'assistant',
      timestamp: minute + 1,
      api: 'fake',
      provider: 'fake',
      model: 'fake',
      usage: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0,
        totalTokens: 0,
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
      },
      stopReason: 'stop',
      content: [
        {
          type: 'text',
          text: `第 ${i + 1} 条回答：滚动几何测试\n\n${'为了把页面撑高，这一段会重复多次。'.repeat(6)}${i === 29 ? `\n\n${longText}` : ''}${i === 0 ? `\n\n${codeText}` : ''}`,
        },
      ],
    },
  })
}

// 真实会话：整条拷进夹具目录（不改写内容），让"长会话下的滚动/渲染"
// 不是只对着我编的形状过关。目录里取行数最多的那一条。
if (existsSync(REAL_SESSION_SOURCE)) {
  const candidates = readdirSync(REAL_SESSION_SOURCE)
    .filter((name) => name.endsWith('.jsonl'))
    .map((name) => ({
      name,
      path: join(REAL_SESSION_SOURCE, name),
      lines: countLines(join(REAL_SESSION_SOURCE, name)),
    }))
    .sort((a, b) => b.lines - a.lines)
  const best = candidates[0]
  if (best) {
    copyFileSync(best.path, join(dir, best.name))
    const id = best.name.replace(/^.*_/, '').replace(/\.jsonl$/, '')
    console.log(`真实长会话：${best.name}（${best.lines} 行，id=${id}）`)
  }
}

const patchText = [
  '*** Begin Patch',
  '*** Update File: packages/web/src/features/chat/block-view.tsx',
  '@@',
  '-  return <p>调用工具：{typed.name}</p>',
  '+  return <ToolCallBlock call={call} />',
  '*** End Patch',
].join('\n')
messages.push({
  type: 'message',
  id: 'long-patch-call',
  parentId: 'long-asst-29',
  timestamp: new Date(base + 120 * 60_000).toISOString(),
  message: {
    role: 'assistant',
    timestamp: 120,
    api: 'fake',
    provider: 'fake',
    model: 'fake',
    usage: {
      input: 0,
      output: 0,
      cacheRead: 0,
      cacheWrite: 0,
      totalTokens: 0,
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
    },
    stopReason: 'toolUse',
    content: [
      { type: 'toolCall', id: 'patch-1', name: 'apply_patch', arguments: { patch: patchText } },
      {
        type: 'toolResult',
        toolCallId: 'patch-1',
        durationMs: 1500,
        content: [{ type: 'text', text: patchText }],
      },
    ],
  },
})

const richMarkdown = [
  '### 变更摘要',
  '',
  '| 文件 | 变更 |',
  '| --- | --- |',
  '| `block-view.tsx` | 接入 `ToolCallBlock` |',
  '| `markdown-body.tsx` | 换成 GFM 渲染 |',
  '',
  '- 表格由 `remark-gfm` 解析',
  '- 行内代码保持等宽',
  '- 外链在新标签打开：[pi-web](https://example.com/pi-web)',
  '',
  '```ts',
  'const x: number = 1',
  '```',
].join('\n')
messages.push({
  type: 'message',
  id: 'long-rich-markdown',
  parentId: 'long-patch-call',
  timestamp: new Date(base + 126 * 60_000).toISOString(),
  message: {
    role: 'assistant',
    timestamp: 126,
    api: 'fake',
    provider: 'fake',
    model: 'fake',
    usage: {
      input: 0,
      output: 0,
      cacheRead: 0,
      cacheWrite: 0,
      totalTokens: 0,
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
    },
    stopReason: 'stop',
    content: [{ type: 'text', text: richMarkdown }],
  },
})

// 错误消息（B-038）：会话文件里错误有三种写法，这里用最常见的 error.message
messages.push({
  type: 'message',
  id: 'long-error',
  parentId: 'long-rich-markdown',
  timestamp: new Date(base + 132 * 60_000).toISOString(),
  message: {
    role: 'assistant',
    timestamp: 132,
    api: 'fake',
    provider: 'fake',
    model: 'fake',
    stopReason: 'error',
    error: { message: '400 Bad Request: model "gpt-none" not found' },
    content: [],
  },
})

// 解析不出文件段的 patch（B-032）：降级成纯文本，而不是把原文吞掉
const junkPatch = [
  '这是工具的原始输出，不是 patch 格式：',
  'fatal: not a git repository',
  'exit 128',
].join('\n')
messages.push({
  type: 'message',
  id: 'long-junk-patch',
  parentId: 'long-error',
  timestamp: new Date(base + 138 * 60_000).toISOString(),
  message: {
    role: 'assistant',
    timestamp: 138,
    api: 'fake',
    provider: 'fake',
    model: 'fake',
    stopReason: 'toolUse',
    content: [
      { type: 'toolCall', id: 'junk-1', name: 'bash', arguments: { command: 'git status' } },
      { type: 'toolResult', toolCallId: 'junk-1', content: [{ type: 'text', text: junkPatch }] },
    ],
  },
})

const lines = [
  {
    type: 'session',
    version: 3,
    id: LONG_SESSION_ID,
    timestamp: new Date(base).toISOString(),
    cwd,
  },
  ...messages,
]
writeFileSync(
  join(dir, `${LONG_SESSION_ID}.jsonl`),
  `${lines.map((line) => JSON.stringify(line)).join('\n')}\n`,
)
console.log(`长会话夹具：${join(dir, `${LONG_SESSION_ID}.jsonl`)}（${lines.length} 行）`)

/** 结构丰富夹具：标题/表格/列表/行内代码/围栏代码各一段，用于保真快照对照。
 *  行形状必须与上面完全一致（`type/message/timestamp + message.content`），
 *  手拼字段（少 parentId 或写成 `content` 顶层）会被读接口判坏 → HTTP 500。 */
export const RICH_SESSION_ID = '01jcrichsession00000000001'
const richBlocks = [
  ['user', '请用标题、表格、列表说明这个能力的边界'],
  [
    'assistant',
    [
      '## 一、边界',
      '本能力只负责**会话面**；顶栏与侧栏属壳。',
      '| 维度 | 本能力 | 归属 |',
      '| --- | --- | --- |',
      '| 消息渲染 | 是 | C-C |',
      '| 停止/压缩 | 是 | C-C |',
      '| 顶栏入口 | 否 | C-B |',
    ].join('\n'),
  ],
  ['user', '再来一段列表与代码'],
  [
    'assistant',
    [
      '### 二、清单',
      '- 甲：渲染',
      '- 乙：排队',
      '- 丙：压缩',
      '',
      '```ts',
      'export function ping(): string {',
      "  return 'pong'",
      '}',
      '```',
    ].join('\n'),
  ],
]
const richLines = [
  {
    type: 'session',
    version: 3,
    id: RICH_SESSION_ID,
    timestamp: new Date(base).toISOString(),
    cwd,
  },
]
let parent = null
richBlocks.forEach(([role, text], i) => {
  const id = `rich-${role}-${i}`
  richLines.push({
    type: 'message',
    id,
    parentId: parent,
    timestamp: new Date(base + i * 60_000).toISOString(),
    message: {
      role,
      timestamp: i,
      content: [{ type: 'text', text }],
      ...(role === 'assistant'
        ? { api: 'fake', provider: 'fake', model: 'fake', stopReason: 'stop' }
        : {}),
    },
  })
  parent = id
})
writeFileSync(
  join(dir, `${RICH_SESSION_ID}.jsonl`),
  `${richLines.map((line) => JSON.stringify(line)).join('\n')}\n`,
)
console.log(`结构夹具：${RICH_SESSION_ID}（${richLines.length} 行）`)

export const EMPTY_SESSION_ID = '01jcemptysession0000000000001'
writeFileSync(
  join(dir, `${EMPTY_SESSION_ID}.jsonl`),
  `${JSON.stringify({ type: 'session', version: 3, id: EMPTY_SESSION_ID, timestamp: new Date(base).toISOString(), cwd })}\n`,
)
console.log(`空会话夹具：${EMPTY_SESSION_ID}（0 条消息）`)
