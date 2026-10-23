#!/usr/bin/env node
// 四向追踪 CLI —— 行为 ↔ 设计 ↔ 任务 ↔ 测试。
//
// 用法:
//   node check-trace.mjs --run <dir> [--tests packages/core/src,packages/web/src,e2e] [--root .] [--json]
// 退出码: 0 = 四向闭合；1 = 有孤儿；2 = 用法错误

import { resolve } from 'node:path'
import { loadJson, parseBehaviors } from './lib/design.mjs'
import { readText } from './lib/tables.mjs'
import { runTrace } from './lib/trace.mjs'

const argv = process.argv.slice(2)
const KNOWN = new Set(['--run', '--tests', '--root', '--json', '--help', '-h'])
for (let i = 0; i < argv.length; i++) {
  const a = argv[i]
  if (!a.startsWith('-')) continue
  if (!KNOWN.has(a)) {
    console.error(`\u274c 未知参数: ${a}\nusage: node check-trace.mjs --run <dir> [--tests a,b]`)
    process.exit(2)
  }
  if (['--run', '--tests', '--root'].includes(a)) i++
}
if (argv.includes('--help') || argv.includes('-h')) {
  console.log('usage: node check-trace.mjs --run <dir> [--tests a,b] [--root .] [--json]')
  process.exit(0)
}
const flag = (n, d = null) => {
  const i = argv.indexOf(`--${n}`)
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d
}
const root = resolve(flag('root', '.'))
const runArg = flag('run')
if (!runArg) {
  console.error('\u274c 缺 --run <dir>')
  process.exit(2)
}
const runDir = resolve(root, runArg)
const testDirs = (flag('tests', 'packages/core/src,packages/web/src,e2e') || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

const manifest = loadJson(resolve(runDir, 'design/manifest.json'))
const behaviors = parseBehaviors(readText(resolve(runDir, 'behaviors.md')))
const res = runTrace({ runDir, manifest, behaviors, root, testDirs })

if (argv.includes('--json')) {
  console.log(JSON.stringify({ res }, null, 2))
} else if (res.ok) {
  console.log(
    `\u2705 四向闭合：${res.totals.behaviors} 条行为 × ${res.totals.design} 个设计元素 × ${res.totals.tasks} 个任务 × ${res.totals.tests} 个测试`,
  )
} else {
  for (const p of res.problems) console.log(`\u274c ${p}`)
}

process.exit(res.ok ? 0 : 1)
