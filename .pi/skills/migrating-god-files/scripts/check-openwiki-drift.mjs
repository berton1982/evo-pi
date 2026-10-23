#!/usr/bin/env node
// OpenWiki 页面漂移检测 —— 判断 E2 证据还能不能用。
//
// 判据：页面里记录的 verified 日期 vs 页面引用的源码文件 mtime。
//       任一引用文件比 verified 新 → STALE（页面里的行号锚点可能已经失效）。
//
// 为什么保留这个检查：E2（wiki 分析）是接缝与产品语言的主要来源，
// 但它会悄悄过期。源码解读是唯一依据，wiki 只作参考——参考过期了就必须先重生成。
//
// 用法:
//   node check-openwiki-drift.mjs --page tech-debt/AppShell.md
//   node check-openwiki-drift.mjs --all
//   node check-openwiki-drift.mjs --page <p> [--wiki-root <dir>] [--as-of YYYY-MM-DD] [--json]
// 退出码: 0 = 全部 FRESH；1 = 有 STALE；2 = 用法/环境错误

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

const argv = process.argv.slice(2)
const KNOWN = new Set([
  '--page',
  '--all',
  '--wiki-root',
  '--as-of',
  '--json',
  '--root',
  '--help',
  '-h',
])
for (let i = 0; i < argv.length; i++) {
  const a = argv[i]
  if (!a.startsWith('-')) continue
  if (!KNOWN.has(a)) {
    console.error(`\u274c 未知参数: ${a}\nusage: node check-openwiki-drift.mjs --page <p> | --all`)
    process.exit(2)
  }
  if (['--page', '--wiki-root', '--as-of', '--root'].includes(a)) i++
}
if (argv.includes('--help') || argv.includes('-h')) {
  console.log(
    'usage: node check-openwiki-drift.mjs --page tech-debt/X.md | --all [--wiki-root <dir>] [--as-of <date>]',
  )
  process.exit(0)
}
const flag = (n, d = null) => {
  const i = argv.indexOf(`--${n}`)
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d
}
const all = argv.includes('--all')
const page = flag('page')
if (!page && !all) {
  console.error('\u274c 需要 --page <path> 或 --all')
  process.exit(2)
}
const appRoot = resolve(flag('root', '.'))
const wikiRoot = resolve(appRoot, flag('wiki-root', 'ref_projects/pi-web/openwiki'))
if (!existsSync(wikiRoot)) {
  console.error(`\u274c wiki 根目录不存在: ${wikiRoot}`)
  process.exit(2)
}
const sourceRoot = resolve(wikiRoot, '..')
const asOf = flag('as-of') ? new Date(flag('as-of')) : null

/** 取页面里记录的 verified 时间：取 verified 块内所有日期的最小值（最保守）。 */
function verifiedDate(md) {
  const lines = md.split('\n')
  const start = lines.findIndex((l) => /^verified\s*:/m.test(l) || /^##\s*verified/i.test(l))
  const dates = []
  const scan = (arr) => {
    for (const l of arr) for (const m of l.matchAll(/(\d{4}-\d{2}-\d{2})/g)) dates.push(m[1])
  }
  if (start >= 0) scan(lines.slice(start, start + 40))
  else scan(lines.slice(0, 60))
  if (!dates.length) return null
  return dates.sort()[0]
}

function sourcesOf(md) {
  const out = new Set()
  for (const m of md.matchAll(/repo:\/\/([^\s)`"']+)/g)) out.add(m[1])
  for (const m of md.matchAll(/ref_projects\/pi-web\/([^\s)`"']+)/g)) out.add(m[1])
  return [...out]
}

function checkPage(absPath) {
  const md = readFileSync(absPath, 'utf8')
  const vd = verifiedDate(md)
  const rel = absPath.replace(`${wikiRoot}/`, '')
  if (!vd) return { page: rel, status: 'UNKNOWN', detail: '页面没有 verified 日期——不能作为证据' }
  const cutoff = asOf && asOf < new Date(vd) ? asOf : new Date(vd)
  const newer = []
  for (const s of sourcesOf(md)) {
    const p = resolve(sourceRoot, s)
    if (!existsSync(p)) continue
    if (statSync(p).mtime > cutoff) newer.push(s)
  }
  return newer.length
    ? {
        page: rel,
        status: 'STALE',
        detail: `${newer.length} 个源码文件比 verified(${vd}) 新：${newer.slice(0, 3).join(', ')}`,
      }
    : { page: rel, status: 'FRESH', detail: `verified ${vd}` }
}

let pages = []
if (all) {
  const walk = (dir) => {
    for (const e of readdirSync(dir)) {
      const p = resolve(dir, e)
      if (statSync(p).isDirectory()) {
        if (['.git', 'node_modules'].includes(e)) continue
        walk(p)
      } else if (e.endsWith('.md')) pages.push(p)
    }
  }
  walk(wikiRoot)
} else {
  pages = [resolve(wikiRoot, page)]
  if (!existsSync(pages[0])) {
    console.error(`\u274c 页面不存在: ${page}`)
    process.exit(2)
  }
}

const reports = pages.map(checkPage)
const bad = reports.filter((r) => r.status !== 'FRESH')

if (argv.includes('--json')) {
  console.log(JSON.stringify({ reports }, null, 2))
} else {
  for (const r of reports) {
    const mark = r.status === 'FRESH' ? '\u2705' : '\u274c'
    console.log(`${mark} ${r.status}  ${r.page}  ${r.detail}`)
  }
  if (bad.length)
    console.log('\n有 STALE/UNKNOWN 页面：先重生成（openwiki update），再把它当证据。')
}

process.exit(bad.length ? 1 : 0)
