#!/usr/bin/env node
// 设计门 D1–D10 —— 让「设计」也机器可判。
//
// 设计压成 design/manifest.json（结构化），散文只做解释。
// 能集合运算证明的（覆盖/唯一/闭合/参与者/依赖/预算）全部做成门；
// 不能证明的（模式是否恰当）压成「必须有观察到的症状 + 被否方案 + 错判成本」，缺字段即红。
//
// 用法:
//   node design-gate.mjs --run <dir> [--program <dir>] [--level R2] [--root .] [--json]
// 退出码: 0 = 全过；1 = 有未过项；2 = 用法错误

import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  loadJson,
  parseBehaviors,
  runDesignDrift,
  runDesignGates,
  runQualityBudget,
} from './lib/design.mjs'
import { parseRanges } from './lib/ownership.mjs'
import { readState } from './lib/store.mjs'
import { readText } from './lib/tables.mjs'

const argv = process.argv.slice(2)
const known = new Set([
  '--run',
  '--program',
  '--level',
  '--root',
  '--json',
  '--design-only',
  '--help',
  '-h',
])
for (let i = 0; i < argv.length; i++) {
  const a = argv[i]
  if (!a.startsWith('-')) continue
  if (!known.has(a)) {
    console.error(
      `\u274c 未知参数: ${a}\nusage: node design-gate.mjs --run <dir> [--program <dir>] [--level R2]`,
    )
    process.exit(2)
  }
  if (['--run', '--program', '--level', '--root'].includes(a)) i++
}
if (argv.includes('--help') || argv.includes('-h')) {
  console.log(
    'usage: node design-gate.mjs --run <dir> [--program <dir>] [--level R2] [--root .] [--json]',
  )
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

let state = null
try {
  state = readState(runDir)
} catch (e) {
  console.error(`\u274c ${e.message}`)
  process.exit(2)
}

const level = flag('level', state.rLevel || 'R3')
const programArg = flag('program', state.programRun || null)
const programDir = programArg ? resolve(root, programArg) : null
if (programDir && !existsSync(programDir)) {
  console.error(`\u274c program run 不存在: ${programArg}`)
  process.exit(2)
}

const manifest = loadJson(resolve(runDir, 'design/manifest.json'))
const behaviors = parseBehaviors(readText(resolve(runDir, 'behaviors.md')))
const surface = loadJson(resolve(runDir, 'surface.json'))
const rules = programDir ? loadJson(resolve(programDir, 'arch/rules.json')) : null

// C4 还没有代码：只跑设计门。质量预算与漂移反查属于 C5。
// 默认按当前阶段判断：C4 段自动只跑设计门。否则 `design-gate` 在 C4 必然报
// DRIFT 红（14 个元素还没有 @design），与 `check-phase` 的 C4 判据不一致，
// 新人会以为阶段被卡住。--design-only 可显式要求；--full 可强制包含质量与漂移。
const designOnly = argv.includes('--design-only')
  ? true
  : argv.includes('--full')
    ? false
    : state.phase === 'C4'
const gates = [
  ...runDesignGates({
    runDir,
    manifest,
    behaviors,
    surface,
    rules,
    level,
    root,
    // D14 要拿 ownership 的归属表与元素的 sources 对账：两边不一致，必有一边在编
    ownershipRanges: parseRanges(readText(resolve(runDir, 'ownership.md')) || ''),
    programDir,
  }),
  ...(designOnly
    ? []
    : [...runQualityBudget({ manifest, root }), ...runDesignDrift({ manifest, root })]),
]

if (argv.includes('--json')) {
  console.log(JSON.stringify({ level, gates }, null, 2))
} else {
  console.log(
    `设计门 — ${state.run}（R 级 ${level}，${designOnly ? '仅设计门' : `设计门 + 质量 + 漂移`}）\n`,
  )
  for (const g of gates) {
    console.log(g.ok ? `\u2705 ${g.id}  ${g.detail}` : `\u274c ${g.id}  ${g.detail}`)
  }
  const bad = gates.filter((g) => !g.ok)
  console.log(
    bad.length
      ? `\n\u274c ${bad.length} 道未过：${bad.map((g) => g.id).join(', ')}`
      : '\n\u2713 设计可校验部分全部通过——可以送签',
  )
}

process.exit(gates.every((g) => g.ok) ? 0 : 1)
