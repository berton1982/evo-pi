#!/usr/bin/env node
// 从符号全集播种 symbol-map.md —— 让 1241 行的对账表可维护。
//
// 为什么需要：实测 AppShell 有 1241 个 LSP 声明。手写 1241 行不现实，
// 结果是"为了过门批量复制粘贴"，门就教会了作弊。播种后人只需要填 owner/status。
//
// 幂等：已有条目（按符号名匹配）保留原值，只补缺失的；不会覆盖人工填写的内容。
//
// 用法:
//   node init-symbol-map.mjs --run <dir> [--god <basename>] [--status pending] [--root .]
// 退出码: 0 = 已写入；1 = 无可播种内容；2 = 用法错误

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, resolve } from 'node:path'
import { parseRanges } from './lib/ownership.mjs'
import { parseSymbolMap, parseSymbols, symbolsFileFor } from './lib/parity.mjs'
import { readState } from './lib/store.mjs'

const argv = process.argv.slice(2)
const KNOWN = new Set(['--run', '--god', '--root', '--status', '--help', '-h'])
for (let i = 0; i < argv.length; i++) {
  const a = argv[i]
  if (!a.startsWith('-')) continue
  if (!KNOWN.has(a)) {
    console.error(
      `\u274c 未知参数: ${a}\nusage: node init-symbol-map.mjs --run <dir> [--god <basename>]`,
    )
    process.exit(2)
  }
  if (['--run', '--god', '--root', '--status'].includes(a)) i++
}
if (argv.includes('--help') || argv.includes('-h')) {
  console.log(
    'usage: node init-symbol-map.mjs --run <dir> [--god <basename>] [--status pending] [--root .]',
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
const status = flag('status', 'pending')

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
  console.error('\u274c 没有可播种的 god（state.gods 为空）')
  process.exit(2)
}

const mapPath = resolve(runDir, 'symbol-map.md')
const existingText = existsSync(mapPath) ? readFileSync(mapPath, 'utf8') : ''
const existing = new Map(parseSymbolMap(existingText).map((r) => [r.name, r]))

// 归属由 ownership.md 的区间推导，而不是让人逐行填：
// C-G 试点里 840 行台账全是 `待定`，说明"手填 owner"在实际成本下不会发生。
const ownershipText = existsSync(resolve(runDir, 'ownership.md'))
  ? readFileSync(resolve(runDir, 'ownership.md'), 'utf8')
  : ''
const ranges = parseRanges(ownershipText).map((r) => ({
  from: r.from,
  to: r.to,
  owner: r.owner,
}))
const ownerOfLine = (line) => {
  const n = Number(line)
  const hit = ranges.find((r) => n >= r.from && n <= r.to)
  return hit ? hit.owner : '待定'
}

const rows = []
let added = 0
let kept = 0
for (const g of gods) {
  const symPath = symbolsFileFor(runDir, basename(g.path))
  if (!existsSync(symPath)) {
    console.error(`\u274c 缺符号全集 ${symPath.replace(`${root}/`, '')}——先导出 LSP 声明全集`)
    process.exit(1)
  }
  const symbols = parseSymbols(readFileSync(symPath, 'utf8'))
  if (!symbols.length) {
    console.error(
      `\u274c ${basename(symPath)} 里没有解析到符号（需要 \`- **Name** (Kind) …\` 列表）`,
    )
    process.exit(1)
  }

  // 去重：同名符号只占一行，行号并列。831 条声明里对象字面量属性大量重名，
  // 逐条成行只会把台账变成导出文件的副本（840 行 / 469 唯一符号）。
  const byName = new Map()
  for (const s of symbols) {
    const cur = byName.get(s.name) ?? { name: s.name, lines: [] }
    if (s.line && !cur.lines.includes(s.line)) cur.lines.push(s.line)
    byName.set(s.name, cur)
  }

  for (const { name, lines } of byName.values()) {
    const prev = existing.get(name)
    const lineText = lines.length ? lines.join('、') : '—'
    const owners = new Set(lines.map(ownerOfLine))
    const owner = owners.size === 1 ? [...owners][0] : owners.size > 1 ? '跨段' : '待定'
    if (prev) {
      kept++
      rows.push([
        `\`${name}\``,
        prev.line && prev.line !== '—' ? prev.line : lineText,
        prev.owner && prev.owner !== '待定' ? prev.owner : owner,
        prev.target || '—',
        prev.status || status,
        prev.reason || '',
      ])
    } else {
      added++
      rows.push([`\`${name}\``, lineText, owner, '—', status, ''])
    }
  }
}

const header = ['pi-web 符号', '行号', '归属切分', 'evo-pi 落点', '状态', '理由']
const md = [
  '# 符号对账表',
  '',
  '> 由 `init-symbol-map.mjs` 播种；同名符号已去重（行号并列）；`归属切分` 由 `ownership.md` 区间推导。',
  '> 人只需补 `落点 / 状态`；`状态` 取值 `pending` / `done`（落点必须存在）/ `drop`（**必须写理由**）。',
  '> 校验：`node .pi/skills/migrating-god-files/scripts/check-symbols.mjs --run <dir>`',
  '',
  `| ${header.join(' | ')} |`,
  `|${header.map(() => '---').join('|')}|`,
  ...rows.map((r) => `| ${r.join(' | ')} |`),
  '',
  '',
].join('\n')

writeFileSync(mapPath, md)
console.log(
  `\u2705 播种完成：新增 ${added} 行，保留 ${kept} 行既有内容 → ${mapPath.replace(`${root}/`, '')}`,
)
console.log('下一步：填 owner 与状态；drop 必须写理由；然后跑 check-symbols。')
