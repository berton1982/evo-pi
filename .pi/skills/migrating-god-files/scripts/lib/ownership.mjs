// 归属表：行区间覆盖 + 归属类型合法性 + 多文件分母。
//
// 三个真实缺陷在这里被修掉：
//   1. 多 god run 只按 gods[0].lines 判覆盖 → 其余文件等于没检查
//   2. 归属类型随便写（"待定" 也能过）→ 没有 owner 的行也能"覆盖"
//   3. drop/不迁 没有理由 → 静默丢弃代码
//
// ownership.md 约定：
//   ## 文件：<path>        （多 god 必须分节；单 god 可省略）
//   | 行区间 | 归属 | 类型 | 依据 |
// 类型 ∈ feature | skeleton | infra | drop

import { basename } from 'node:path'
import { columnOf, parseTables, stripCell } from './tables.mjs'

const TYPES = new Set(['feature', 'skeleton', 'infra', 'drop'])

/** 按 `## 文件：` 分节；无分节时返回单节（file = null） */
export function splitSections(md) {
  const lines = (md || '').split('\n')
  const out = []
  let cur = { file: null, lines: [] }
  for (const line of lines) {
    const m = line.match(/^##+\s*文件[:：]\s*(.+?)\s*$/)
    if (m) {
      out.push(cur)
      cur = { file: m[1].replace(/`/g, '').trim(), lines: [] }
    } else cur.lines.push(line)
  }
  out.push(cur)
  return out.filter((s) => s.lines.join('').trim().length)
}

export function parseRanges(text) {
  const rows = []
  for (const t of parseTables(text)) {
    // 表头允许「行区间 / 行范围 / 范围」——试运行时写成「行范围」，
    // 判定直接变成"没有解析到任何行区间"，而错误信息没说是表头不匹配，白排查一轮。
    const rangeCol = ['行区间', '行范围', '范围', 'lines'].reduce(
      (acc, h) => (acc >= 0 ? acc : columnOf(t.header, h)),
      -1,
    )
    if (rangeCol < 0) continue
    const ownerCol = columnOf(t.header, '归属')
    const typeCol = columnOf(t.header, '类型')
    const whyCol = ['依据', '说明', '理由'].reduce(
      (acc, h) => (acc >= 0 ? acc : columnOf(t.header, h)),
      -1,
    )
    for (const row of t.rows) {
      const cell = row[rangeCol] || ''
      for (const m of cell.matchAll(/L(\d+)(?:\s*[-\u2013\u2014~\u81f3]\s*L?(\d+))?/g)) {
        const a = Number(m[1])
        const b = m[2] ? Number(m[2]) : a
        if (a > 0 && b >= a) {
          rows.push({
            a,
            b,
            owner: ownerCol >= 0 ? stripCell(row[ownerCol]) : '',
            type: typeCol >= 0 ? stripCell(row[typeCol]).toLowerCase() : '',
            why: whyCol >= 0 ? stripCell(row[whyCol]) : '',
          })
        }
      }
    }
  }
  return rows
}

export function gapsOf(ranges, total) {
  const merged = []
  for (const [a, b] of ranges.sort((x, y) => x[0] - y[0])) {
    const last = merged[merged.length - 1]
    if (last && a <= last[1] + 1) last[1] = Math.max(last[1], b)
    else merged.push([a, b])
  }
  const gaps = []
  let cursor = 1
  for (const [a, b] of merged) {
    if (a > cursor) gaps.push([cursor, a - 1])
    cursor = Math.max(cursor, b + 1)
  }
  if (cursor <= total) gaps.push([cursor, total])
  return gaps
}

/**
 * 每个 god 单独判覆盖。多 god 时必须分节，否则明确报错（不做"大概覆盖"）。
 * @returns {{ok:boolean, perGod:{file:string,gaps:number[][],found:boolean}[], problems:string[]}}
 */
export function runOwnershipCoverage(md, gods) {
  const problems = []
  const sections = splitSections(md)
  const perGod = []
  for (const g of gods) {
    const base = basename(g.path)
    const sec =
      sections.find((s) => s.file && basename(s.file) === base) ||
      (gods.length === 1 && !sections.some((s) => s.file) ? sections[0] : null)
    if (!sec) {
      perGod.push({ file: base, gaps: [], found: false })
      problems.push(`${base} 没有 \`## 文件：${g.path}\` 分节——多 god run 必须分节，否则无法判覆盖`)
      continue
    }
    const ranges = parseRanges(sec.lines.join('\n')).map((r) => [r.a, r.b])
    const gaps = gapsOf(ranges, g.lines)
    perGod.push({ file: base, gaps, found: true })
    if (gaps.length) {
      problems.push(
        `${base} 漏归属 ${gaps.length} 段：${gaps
          .slice(0, 5)
          .map(([a, b]) => `L${a}-L${b}`)
          .join(', ')}`,
      )
    }
  }
  return { ok: problems.length === 0, perGod, problems }
}

/** 类型必须合法；drop 必须有依据 */
export function runOwnershipTypes(md) {
  const problems = []
  let total = 0
  for (const sec of splitSections(md)) {
    for (const r of parseRanges(sec.lines.join('\n'))) {
      total++
      const where = `${sec.file ? `${basename(sec.file)} ` : ''}L${r.a}-L${r.b}`
      if (!r.type) problems.push(`${where} 缺「类型」`)
      else if (!TYPES.has(r.type))
        problems.push(`${where} 类型「${r.type}」非法（只能是 feature/skeleton/infra/drop）`)
      if (!r.owner) problems.push(`${where} 缺「归属」`)
      if (r.type === 'drop' && !r.why)
        problems.push(`${where} 标为 drop 但没有依据——不许静默丢弃代码`)
    }
  }
  if (!total) problems.push('ownership.md 里没有解析到任何行区间')
  return { ok: problems.length === 0, total, problems }
}
