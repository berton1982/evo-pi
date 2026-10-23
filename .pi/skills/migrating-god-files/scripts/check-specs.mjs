#!/usr/bin/env node
// 规格校验 CLI —— 证据锚点可解析 + 禁词 + 测试 ID 落地。
//
// 用法:
//   node check-specs.mjs --run <dir> [--tests packages/core/src,packages/web/src,e2e] [--root .] [--json]
// 退出码: 0 = 通过；1 = 有阻断项；2 = 用法错误

import { resolve } from 'node:path'
import { runSpecGates } from './lib/specs.mjs'

const argv = process.argv.slice(2)
const KNOWN = new Set(['--run', '--tests', '--root', '--json', '--help', '-h'])
for (let i = 0; i < argv.length; i++) {
  const a = argv[i]
  if (!a.startsWith('-')) continue
  if (!KNOWN.has(a)) {
    console.error(`\u274c 未知参数: ${a}\nusage: node check-specs.mjs --run <dir> [--tests a,b]`)
    process.exit(2)
  }
  if (['--run', '--tests', '--root'].includes(a)) i++
}
if (argv.includes('--help') || argv.includes('-h')) {
  console.log('usage: node check-specs.mjs --run <dir> [--tests a,b,c] [--root .] [--json]')
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
const testDirs = (flag('tests', 'packages/core/src,packages/web/src,e2e') || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

const results = runSpecGates({ runDir: resolve(root, runArg), root, testDirs })

if (argv.includes('--json')) {
  console.log(JSON.stringify({ results }, null, 2))
} else {
  for (const r of results)
    console.log(r.ok ? `\u2705 ${r.id}  ${r.detail}` : `\u274c ${r.id}  ${r.detail}`)
}

process.exit(results.every((r) => r.ok) ? 0 : 1)
