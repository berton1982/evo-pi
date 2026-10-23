#!/usr/bin/env node
// 符号级对账 CLI —— 与 check-phase 的 C1 门共用 lib/parity.mjs。
//
// 用法:
//   node check-symbols.mjs --run <dir> [--god <basename>] [--root .] [--json]
// 退出码: 0 = 对账平；1 = 有遗漏/过期/虚报/无理由 drop；2 = 用法错误

import { basename, resolve } from 'node:path'
import { readOrNull, runSymbolParity, symbolsFileFor } from './lib/parity.mjs'
import { readState } from './lib/store.mjs'

const argv = process.argv.slice(2)
const KNOWN = new Set(['--run', '--god', '--root', '--json', '--help', '-h'])
for (let i = 0; i < argv.length; i++) {
  const a = argv[i]
  if (!a.startsWith('-')) continue
  if (!KNOWN.has(a)) {
    console.error(
      `\u274c 未知参数: ${a}\nusage: node check-symbols.mjs --run <dir> [--god <basename>]`,
    )
    process.exit(2)
  }
  if (['--run', '--god', '--root'].includes(a)) i++
}
if (argv.includes('--help') || argv.includes('-h')) {
  console.log('usage: node check-symbols.mjs --run <dir> [--god <basename>] [--root .] [--json]')
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

const only = flag('god')
const gods = only ? state.gods.filter((g) => basename(g.path) === basename(only)) : state.gods
if (!gods.length) {
  console.error(
    `\u274c 没有匹配的 god（本 run 涉及：${state.gods.map((g) => basename(g.path)).join(', ') || '无'}）`,
  )
  process.exit(2)
}

const mapText = readOrNull(resolve(runDir, 'symbol-map.md'))
if (mapText === null) {
  console.error('\u274c 缺 symbol-map.md——C1 必须产出符号对账表')
  process.exit(1)
}

const reports = []
for (const g of gods) {
  const symPath = symbolsFileFor(runDir, basename(g.path))
  const symText = readOrNull(symPath)
  if (symText === null) {
    reports.push({
      god: basename(g.path),
      ok: false,
      totals: {},
      problems: [`缺符号全集 ${symPath.replace(`${root}/`, '')}——先导出 LSP 声明全集`],
    })
    continue
  }
  reports.push({
    god: basename(g.path),
    ...runSymbolParity({ symbolsText: symText, mapText, root }),
  })
}

if (argv.includes('--json')) {
  console.log(JSON.stringify({ run: state.run, reports }, null, 2))
} else {
  console.log(`符号对账 — ${state.run}\n`)
  for (const r of reports) {
    console.log(`── ${r.god} ──`)
    if (r.ok) console.log(`\u2705 ${r.totals.symbols} 个符号全部对账（遗漏 0 / 过期 0 / 虚报 0）`)
    else for (const p of r.problems) console.log(`\u274c ${p}`)
  }
}

process.exit(reports.every((r) => r.ok) ? 0 : 1)
