#!/usr/bin/env node
// 契约覆盖 CLI —— 源码表面（命令/事件）必须全部在冻结契约里；DTO 字段必须被 zod schema 覆盖。
//
// 分母来自 surface.json（独立的一次源码扫描），契约是被核对的一方。
// 这样"生成契约"与"校验契约"来自两个独立视角，才能互相证伪。
//
// 用法:
//   node check-contracts.mjs --run <capability-run> [--program <program-run>] [--root .] [--json]
// 退出码: 0 = 覆盖完整；1 = 有缺口；2 = 用法错误

import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { checkContractInventory, checkSchema } from './lib/contracts.mjs'
import { loadJson } from './lib/design.mjs'
import { readState } from './lib/store.mjs'
import { readText } from './lib/tables.mjs'

const argv = process.argv.slice(2)
const KNOWN = new Set(['--run', '--program', '--root', '--json', '--help', '-h'])
for (let i = 0; i < argv.length; i++) {
  const a = argv[i]
  if (!a.startsWith('-')) continue
  if (!KNOWN.has(a)) {
    console.error(
      `\u274c 未知参数: ${a}\nusage: node check-contracts.mjs --run <dir> [--program <dir>]`,
    )
    process.exit(2)
  }
  if (['--run', '--program', '--root'].includes(a)) i++
}
if (argv.includes('--help') || argv.includes('-h')) {
  console.log('usage: node check-contracts.mjs --run <dir> [--program <dir>] [--root .] [--json]')
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

let state
try {
  state = readState(runDir)
} catch (e) {
  console.error(`\u274c ${e.message}`)
  process.exit(2)
}

const programArg = flag('program', state.programRun)
if (!programArg) {
  console.error('\u274c 缺 --program（或本 run 未关联纲领）')
  process.exit(2)
}
const contractDir = resolve(root, programArg, 'contracts')
if (!existsSync(contractDir)) {
  console.error(`\u274c 契约目录不存在: ${programArg}/contracts`)
  process.exit(2)
}

const surface = loadJson(resolve(runDir, 'surface.json'))
if (!surface) {
  console.error('\u274c 缺 surface.json——先跑 enumerate-surface（契约覆盖的分母）')
  process.exit(1)
}

const wireText = readText(resolve(contractDir, 'wire.md'))
const inv = checkContractInventory({ surface, wireText })
const schema = checkSchema(contractDir)
const results = [
  {
    id: 'CONTRACT1',
    ok: inv.ok,
    detail:
      inv.problems.join('；') ||
      `命令 ${inv.totals.sourceCommands} / 事件 ${inv.totals.sourceEvents} 全部在契约里`,
  },
  {
    id: 'CONTRACT2',
    ok: schema.ok,
    detail: schema.problems.join('；') || `DTO ${schema.totals.fields} 个字段被 schema 覆盖`,
  },
]

if (argv.includes('--json')) {
  console.log(
    JSON.stringify({ results, totals: { inventory: inv.totals, schema: schema.totals } }, null, 2),
  )
} else {
  for (const r of results)
    console.log(r.ok ? `\u2705 ${r.id}  ${r.detail}` : `\u274c ${r.id}  ${r.detail}`)
}

process.exit(results.every((r) => r.ok) ? 0 : 1)
