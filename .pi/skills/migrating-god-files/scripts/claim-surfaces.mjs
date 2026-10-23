#!/usr/bin/env node
// 批量认领表面点 —— 让 100 个表面点不必逐个手点。
//
// 为什么要它：实测 AppShell 有 100 个表面点（aria 57 / onClick 18 / 鼠标进出 22 / role 3）。
// D2 要求"每个表面点都有归属"，逐个手写会诱发"批量复制同一个 owner"的作弊。
// 批量认领把机械劳动交给脚本，把判断（哪些属于哪个元素）留给规则表达。
//
// 用法:
//   node claim-surfaces.mjs --run <dir> --owner D-B-01 --kind handler:onClick
//   node claim-surfaces.mjs --run <dir> --owner D-B-01 --file components/AppShell.tsx
//   node claim-surfaces.mjs --run <dir> --owner D-B-01 --id SF-AS-h1a2b3
//   node claim-surfaces.mjs --run <dir> --exclude D-X-99 --reason "pi-web 特有"
//   node claim-surfaces.mjs --run <dir> --report        # 只看还剩多少没认领
// 退出码: 0 = 已写入/已报告；1 = 无可认领项；2 = 用法错误

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const argv = process.argv.slice(2)
const KNOWN = new Set([
  '--run',
  '--root',
  '--owner',
  '--kind',
  '--file',
  '--id',
  '--exclude',
  '--reason',
  '--report',
  '--json',
  '--help',
  '-h',
])
for (let i = 0; i < argv.length; i++) {
  const a = argv[i]
  if (!a.startsWith('-')) continue
  if (!KNOWN.has(a)) {
    console.error(
      `\u274c 未知参数: ${a}\nusage: node claim-surfaces.mjs --run <dir> --owner D-B-01 --kind handler:onClick`,
    )
    process.exit(2)
  }
  if (
    ['--run', '--root', '--owner', '--kind', '--file', '--id', '--exclude', '--reason'].includes(a)
  )
    i++
}
if (argv.includes('--help') || argv.includes('-h')) {
  console.log(
    'usage: node claim-surfaces.mjs --run <dir> --owner <D-xxx> [--kind k] [--file f] [--id id]',
  )
  console.log('       node claim-surfaces.mjs --run <dir> --exclude <D-xxx> --reason "..."')
  console.log('       node claim-surfaces.mjs --run <dir> --report')
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

const surfacePath = resolve(runDir, 'surface.json')
const manifestPath = resolve(runDir, 'design/manifest.json')
if (!existsSync(surfacePath)) {
  console.error('\u274c 缺 surface.json——先跑 enumerate-surface')
  process.exit(2)
}
const surface = JSON.parse(readFileSync(surfacePath, 'utf8'))
const manifest = existsSync(manifestPath)
  ? JSON.parse(readFileSync(manifestPath, 'utf8'))
  : { surfaces: {}, excluded: {} }
manifest.surfaces = manifest.surfaces || {}
manifest.excluded = manifest.excluded || {}

const claimed = () =>
  new Set([...Object.keys(manifest.surfaces), ...Object.keys(manifest.excluded)])
const unclaimed = () => surface.entries.filter((e) => !claimed().has(e.id))

if (argv.includes('--report')) {
  const left = unclaimed()
  // 分账要两头都报：只看"还剩多少"会得出"认领过半就够了"的错觉，
  // 而 i18n 50 条与交互 12 条的认领难度完全不同。
  const mine = claimed()
  const ledger = {}
  for (const e of surface.entries) {
    const k = e.kind || 'unknown'
    ledger[k] = ledger[k] || { total: 0, claimed: 0, unclaimed: 0 }
    ledger[k].total += 1
    if (mine.has(e.id)) ledger[k].claimed += 1
    else ledger[k].unclaimed += 1
  }
  const out = {
    total: surface.entries.length,
    claimed: mine.size,
    unclaimed: left.length,
    byKind: ledger,
  }
  if (argv.includes('--json')) console.log(JSON.stringify(out, null, 2))
  else {
    console.log(`表面点 ${out.total} 个：已认领 ${out.claimed}，未认领 ${out.unclaimed}`)
    console.log('   按 kind 分账（已认领/总数）：')
    for (const [k, v] of Object.entries(ledger).sort((a, b) => b[1].total - a[1].total))
      console.log(
        `   ${k}: ${v.claimed}/${v.total}${v.unclaimed ? `  （未认领 ${v.unclaimed}）` : ''}`,
      )
  }
  process.exit(0)
}

const excludeOwner = flag('exclude')
const owner = flag('owner')
if (!owner && !excludeOwner) {
  console.error('\u274c 需要 --owner <D-xxx> 或 --exclude <D-xxx> --reason "..."')
  process.exit(2)
}
if (excludeOwner && !flag('reason')) {
  console.error('\u274c --exclude 必须带 --reason（不许静默丢弃表面点）')
  process.exit(2)
}

const kind = flag('kind')
const file = flag('file')
const id = flag('id')
const targets = surface.entries.filter(
  (e) =>
    (id ? e.id === id : true) &&
    (kind ? e.kind === kind : true) &&
    (file ? e.file.includes(file) : true),
)
if (!targets.length) {
  console.error('\u274c 没有匹配的表面点（用 --report 看还剩什么）')
  process.exit(1)
}

for (const e of targets) {
  if (excludeOwner) manifest.excluded[e.id] = `${excludeOwner}: ${flag('reason')}`
  else manifest.surfaces[e.id] = owner
}
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)

const left = unclaimed().length
console.log(
  `\u2705 认领 ${targets.length} 个表面点 → ${owner || `excluded(${excludeOwner})`}；剩余未认领 ${left} 个`,
)
if (left) console.log('   继续用 --kind / --file 分批，或 --report 看分布。')
