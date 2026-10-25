#!/usr/bin/env node
// 阶段门校验器——只判机器能证伪的部分。
//
// 与 state.mjs advance 共用 lib/checks.mjs：一个门，两处触发（推进时 / 事后抽检时）。
//
// 用法:
//   node check-phase.mjs --run <dir> [--phase C4] [--all] [--root .] [--json]
// 退出码: 0 = 全过；1 = 有未过项；2 = 用法或环境错误

import { resolve } from 'node:path'
import { formatReport, runPhaseChecks } from './lib/checks.mjs'
import { phaseById, phasesOf, SCOPE_PHASES } from './lib/phases.mjs'
import { readState } from './lib/store.mjs'

const argv = process.argv.slice(2)
const KNOWN = new Set(['--run', '--phase', '--root', '--json', '--all', '--help', '-h'])
for (let i = 0; i < argv.length; i++) {
  const a = argv[i]
  if (!a.startsWith('-')) continue
  if (!KNOWN.has(a)) {
    console.error(
      `\u274c 未知参数: ${a}\nusage: node check-phase.mjs --run <dir> [--phase C4] [--all] [--root .] [--json]`,
    )
    process.exit(2)
  }
  if (['--run', '--phase', '--root'].includes(a)) i++
}
if (argv.includes('--help') || argv.includes('-h')) {
  console.log('usage: node check-phase.mjs --run <dir> [--phase C4] [--all] [--root .] [--json]')
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

const wantAll = argv.includes('--all')
const only = flag('phase', wantAll ? null : state.phase)
if (!wantAll && !only) {
  console.error('\u274c 缺 --phase（或 --all）')
  process.exit(2)
}
const scopeList = SCOPE_PHASES[state.scope] || []
if (!wantAll && !scopeList.includes(only)) {
  console.error(
    `\u274c 阶段 ${only} 不属于 scope=${state.scope}（本作用域：${scopeList.join(' ')}）`,
  )
  process.exit(2)
}
if (wantAll && !phasesOf(state.scope).length) {
  console.error(`\u274c scope=${state.scope} 没有阶段定义`)
  process.exit(2)
}

const targets = wantAll ? phasesOf(state.scope).map((p) => p.id) : [only]
const reports = targets.map((t) => runPhaseChecks(runDir, t, { root, state }))

if (argv.includes('--json')) {
  console.log(
    JSON.stringify(
      { run: state.run, scope: state.scope, level: state.rLevel, phase: state.phase, reports },
      null,
      2,
    ),
  )
} else {
  console.log(`目录: ${state.run}（${state.scope}${state.rLevel ? ` · ${state.rLevel}` : ''}）`)
  console.log(`当前阶段: ${state.phase}（${state.phaseStatus}）\n`)
  for (const r of reports) {
    const p = phaseById(r.phase)
    // 回归验早期阶段时 phaseById 可能查不到（阶段表按 scope 组装），
    // 这里退化成 id 本身，不能因为展示失败把整次校验崩掉。
    console.log(`── ${r.phase} ${p?.name ?? ''} ──`)
    console.log(formatReport(r))
    console.log(r.ok ? '   \u2713 门通过' : '   \u2717 门未过')
    console.log()
  }
}

process.exit(reports.every((r) => r.ok) ? 0 : 1)
