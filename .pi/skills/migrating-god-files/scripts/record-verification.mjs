#!/usr/bin/env node
// 记录验证证据：真跑命令，落 gates/<id>.json。
//
// 这是"门不再读人手写的 ✅"的唯一入口。C5/C6/X1 的硬门都读这份 JSON。
//
// 用法:
//   node record-verification.mjs --run <dir> --id C5 --cmd "pnpm test" --cmd "pnpm lint"
//   node record-verification.mjs --run <dir> --id C5 --from-plan plans/C-A.md
//   node record-verification.mjs --run <dir> --id C5 --dry-run     # 只列出将要跑的命令
// 退出码: 0 = 全部命令 exit 0；1 = 有命令失败（证据仍然写入）；2 = 用法错误

import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { columnOf, parseTables, stripCell } from './lib/tables.mjs'
import { recordVerification } from './lib/verify.mjs'

const argv = process.argv.slice(2)
const KNOWN = new Set([
  '--run',
  '--root',
  '--id',
  '--cmd',
  '--from-plan',
  '--dry-run',
  '--json',
  '--help',
  '-h',
])
for (let i = 0; i < argv.length; i++) {
  const a = argv[i]
  if (!a.startsWith('-')) continue
  if (!KNOWN.has(a)) {
    console.error(
      `\u274c 未知参数: ${a}\nusage: node record-verification.mjs --run <dir> --id C5 --cmd "..."`,
    )
    process.exit(2)
  }
  if (['--run', '--root', '--id', '--cmd', '--from-plan'].includes(a)) i++
}
if (argv.includes('--help') || argv.includes('-h')) {
  console.log(
    'usage: node record-verification.mjs --run <dir> --id C5 (--cmd "..." | --from-plan <file>) [--dry-run]',
  )
  process.exit(0)
}
const flag = (n, d = null) => {
  const i = argv.indexOf(`--${n}`)
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d
}
const root = resolve(flag('root', '.'))
const runArg = flag('run')
const id = flag('id')
if (!runArg || !id) {
  console.error('\u274c 缺 --run 或 --id')
  process.exit(2)
}
const runDir = resolve(root, runArg)

const commands = argv.flatMap((a, i) => (a === '--cmd' ? [argv[i + 1]] : [])).filter(Boolean)

// 从 plan 的「验收命令」列收集命令（去掉反引号，跳过以 `manual:` 开头的条目）
const planArg = flag('from-plan')
if (planArg) {
  const p = resolve(runDir, planArg)
  if (!existsSync(p)) {
    console.error(`\u274c plan 不存在: ${planArg}`)
    process.exit(2)
  }
  const md = readFileSync(p, 'utf8')
  for (const t of parseTables(md)) {
    const col = columnOf(t.header, '验收')
    if (col < 0) continue
    for (const row of t.rows) {
      const cell = stripCell(row[col])
      for (const part of cell.split(/[;；]/)) {
        const cmd = part.replace(/`/g, '').trim()
        if (cmd && !/^manual:/i.test(cmd)) commands.push(cmd)
      }
    }
  }
}

// 去重：多个任务常共用同一条验收命令（如整个包的 `pnpm test`），重复跑没有额外信息。
const deduped = [...new Set(commands)]

if (!deduped.length) {
  console.error('\u274c 没有可执行的命令（用 --cmd 或 --from-plan 提供）')
  process.exit(2)
}

if (argv.includes('--dry-run')) {
  console.log(`将运行 ${deduped.length} 条命令（cwd=${root}）：`)
  for (const c of deduped) console.log(`  $ ${c}`)
  process.exit(0)
}

const payload = recordVerification({ runDir, id, commands: deduped, root })
const failed = payload.runs.filter((r) => r.exit !== 0)

if (argv.includes('--json')) {
  console.log(JSON.stringify(payload, null, 2))
} else {
  for (const r of payload.runs) {
    const mark = r.exit === 0 ? '\u2705' : '\u274c'
    console.log(`${mark} exit ${r.exit}  ${r.durationMs}ms  $ ${r.cmd}`)
  }
  console.log(`\n证据已写入 gates/${id}.json`)
}

if (failed.length) {
  console.log(`\n\u274c ${failed.length} 条命令失败——修完重跑；证据已按实际结果记录`)
}
process.exit(failed.length ? 1 : 0)
