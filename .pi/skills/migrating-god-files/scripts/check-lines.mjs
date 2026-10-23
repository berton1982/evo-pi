#!/usr/bin/env node
// 行级交付保证 CLI —— 每个 god 的每一行要么落到有实现文件的元素，要么在砍掉清单里。
//
// 三种模式（阶段递进）：
//   --mode structure  C1：连续无空洞、owner 形如 D-*、drop 必须在 cut-list 且有理由
//   --mode bind       C4：owner ∈ manifest 元素；每个元素至少被 1 个区间认领
//   --mode landed     C5：落地文件存在且含 `@design <元素ID>` 标记
//
// 用法:
//   node check-lines.mjs --run <dir> [--mode structure|bind|landed] [--root .] [--json]
// 退出码: 0 = 该档全绿；1 = 有缺口；2 = 用法错误

import { resolve } from 'node:path'
import { loadJson } from './lib/design.mjs'
import { readIfExists, runLineCoverage, totalLines } from './lib/lines.mjs'
import { readState } from './lib/store.mjs'

const argv = process.argv.slice(2)
const KNOWN = new Set(['--run', '--root', '--mode', '--json', '--help', '-h'])
for (let i = 0; i < argv.length; i++) {
  const a = argv[i]
  if (!a.startsWith('-')) continue
  if (!KNOWN.has(a)) {
    console.error(
      `\u274c 未知参数: ${a}\nusage: node check-lines.mjs --run <dir> [--mode structure|bind|landed]`,
    )
    process.exit(2)
  }
  if (['--run', '--root', '--mode'].includes(a)) i++
}
if (argv.includes('--help') || argv.includes('-h')) {
  console.log(
    'usage: node check-lines.mjs --run <dir> [--mode structure|bind|landed] [--root .] [--json]',
  )
  process.exit(0)
}
const flag = (n, d = null) => {
  const i = argv.indexOf(`--${n}`)
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d
}
const root = resolve(flag('root', '.'))
const runArg = flag('run')
const mode = flag('mode', 'structure')
if (!runArg) {
  console.error('\u274c 缺 --run <dir>')
  process.exit(2)
}
if (!['structure', 'bind', 'landed'].includes(mode)) {
  console.error('\u274c --mode 只能是 structure|bind|landed')
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

const res = runLineCoverage({
  md: readIfExists(resolve(runDir, 'ownership.md')),
  gods: state.gods || [],
  manifest: loadJson(resolve(runDir, 'design/manifest.json')),
  cutListText: readIfExists(resolve(runDir, 'cut-list.md')),
  root,
  mode,
})

if (argv.includes('--json')) {
  console.log(JSON.stringify(res, null, 2))
} else if (res.ok) {
  const denom = totalLines(state.gods)
  console.log(
    `\u2705 行级闭合（${mode}）：${res.totals.lines}/${denom} 行归属 ${res.totals.ranges} 个区间，` +
      `${res.totals.claimedElements} 个元素被认领，${res.totals.drops} 条砍掉项`,
  )
} else {
  for (const p of res.problems.slice(0, 12)) console.log(`\u274c ${p}`)
  if (res.problems.length > 12) console.log(`… 另有 ${res.problems.length - 12} 条`)
}

process.exit(res.ok ? 0 : 1)
