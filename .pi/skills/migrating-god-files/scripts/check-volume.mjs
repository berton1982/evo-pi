#!/usr/bin/env node
// 工件体量预算 CLI —— 判据在 lib/volume.mjs（与 C5 门共用）。
//
// 用法:
//   node check-volume.mjs --run <dir> [--prose 400] [--data 5000] [--root .]
// 退出码: 0 = 合规；1 = 超限；2 = 用法错误

import { resolve } from 'node:path'
import { runVolume } from './lib/volume.mjs'

const argv = process.argv.slice(2)
const KNOWN = new Set(['--run', '--root', '--prose', '--data', '--json', '--help', '-h'])
for (let i = 0; i < argv.length; i++) {
  const a = argv[i]
  if (!a.startsWith('-')) continue
  if (!KNOWN.has(a)) {
    console.error(
      `\u274c 未知参数: ${a}\nusage: node check-volume.mjs --run <dir> [--prose 400] [--data 5000]`,
    )
    process.exit(2)
  }
  if (['--run', '--root', '--prose', '--data'].includes(a)) i++
}
if (argv.includes('--help') || argv.includes('-h')) {
  console.log('usage: node check-volume.mjs --run <dir> [--prose 400] [--data 5000] [--root .]')
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

const res = runVolume(resolve(root, runArg), {
  prose: Number(flag('prose', '400')),
  data: Number(flag('data', '5000')),
})

if (argv.includes('--json')) {
  console.log(JSON.stringify(res, null, 2))
} else if (res.ok) {
  console.log(`\u2705 体量合规（共 ${res.rows.length} 个工件）`)
  for (const r of res.rows.sort((a, b) => b.lines / b.cap - a.lines / a.cap).slice(0, 5)) {
    console.log(`   ${r.lines}/${r.cap}  ${r.file}`)
  }
} else {
  for (const p of res.problems) console.log(`\u274c ${p}`)
  console.log('\n超限的判断型文档请拆成「索引 + 子文档」，或把表格迁到数据工件。')
}

process.exit(res.ok ? 0 : 1)
