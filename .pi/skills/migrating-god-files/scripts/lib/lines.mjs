// 行级交付保证：god 文件的每一行都必须有"去处"。
//
// 为什么需要它（上一代技能的教训）：`extract-features` / `build-feature-index` /
// `verify-features` 曾把"特性块 ↔ 行区间"绑起来，v2 用 behaviors+surface+symbols
// 替代时把这条线**丢了**。后果是：符号对账只覆盖声明（AppShell 1241 声明里
// 大量 JSX/effect 体不在其中），于是"每个符号都有归属"≠"每一行都有着落"。
//
// 本文件把行区间重新变成**可机器验证的交付契约**，三档递进：
//   structure：连续、无空洞、owner 形如 D-*、drop 必须在 cut-list 且有理由
//   bind     ：owner ∈ design/manifest.json 的元素；每个元素至少被 1 个区间认领
//   landed   ：feature/skeleton 的元素必须有 landing 且文件存在、代码里有 @design 标记
//
// 一旦三档全绿，就能回答"每个 god 的每一行要么落到某个有实现文件的元素，
// 要么在砍掉清单里带理由"——这是符号对账证明不了的。

import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { parseRanges, runOwnershipCoverage, splitSections } from './ownership.mjs'
import { columnOf, parseTables, stripCell } from './tables.mjs'

/** 不占代码行的元素类型：它们是横切概念，行归属体现在别的元素上 */
const NO_LINE_KINDS = new Set(['state', 'port'])

const DROP_RANGE = /L\d+(\s*[-\u2013\u2014~至]\s*L?\d+)?/

/** 解析 cut-list.md：`| 原代码 | 范围 | 理由 | 影响 |` */
export function parseCutList(md) {
  const out = []
  for (const t of parseTables(md || '')) {
    const rangeCol = columnOf(t.header, '范围')
    if (rangeCol < 0) continue
    const codeCol = columnOf(t.header, '原代码')
    const whyCol = columnOf(t.header, '理由')
    const impactCol = columnOf(t.header, '影响')
    for (const row of t.rows) {
      const cell = stripCell(row[rangeCol] || '')
      if (!DROP_RANGE.test(cell)) continue
      out.push({
        code: codeCol >= 0 ? stripCell(row[codeCol]) : '',
        range: cell.replace(/\s/g, ''),
        why: whyCol >= 0 ? stripCell(row[whyCol]) : '',
        impact: impactCol >= 0 ? stripCell(row[impactCol]) : '',
      })
    }
  }
  return out
}

function allRanges(md) {
  const out = []
  for (const sec of splitSections(md)) {
    for (const r of parseRanges(sec.lines.join('\n'))) {
      out.push({ ...r, file: sec.file ? sec.file.split('/').pop() : null })
    }
  }
  return out
}

const key = (r) => `L${r.a}-L${r.b}`

/**
 * @param {object} o
 * @param {string} o.md            ownership.md 内容
 * @param {Array}  o.gods          state.gods（含 path/lines）
 * @param {object} [o.manifest]    design/manifest.json（bind/landed 必需）
 * @param {string} [o.cutListText] cut-list.md 内容
 * @param {string} [o.root]        仓库根（landed 检查落地文件）
 * @param {'structure'|'bind'|'landed'} [o.mode]
 */
function boundIdsOf(manifest) {
  const map = new Map()
  for (const group of ['components', 'hooks', 'stores']) {
    for (const item of manifest?.[group] ?? []) {
      if (!item?.element || !item?.id) continue
      const list = map.get(item.element) ?? []
      list.push(item.id)
      map.set(item.element, list)
    }
  }
  return map
}

export function runLineCoverage({
  md,
  gods,
  manifest,
  cutListText = '',
  root = '.',
  mode = 'structure',
}) {
  const problems = []
  const ranges = allRanges(md)

  // ---- 第 0 档：每行都有归属（复用 ownership 的 gap 判定）----
  const cov = runOwnershipCoverage(md, gods)
  problems.push(...cov.problems)

  // ---- 第 1 档：结构 ----
  const cuts = parseCutList(cutListText)
  const cutKeys = new Set(cuts.map((c) => c.range))
  for (const c of cuts) {
    if (!c.why) problems.push(`cut-list ${c.range} 没有理由——不许静默丢弃`)
    if (!c.impact) problems.push(`cut-list ${c.range} 缺「影响」列（删了会影响谁）`)
  }
  for (const r of ranges) {
    const where = `${r.file ? `${r.file} ` : ''}${key(r)}`
    if (!/^D-[A-Z]-[0-9]/.test(r.owner) && r.type !== 'drop') {
      problems.push(
        `${where} 归属「${r.owner}」不是元素 ID（D-<类>-<序号>）——行区间无法追踪到设计元素`,
      )
    }
    if (r.type === 'drop' && !cutKeys.has(key(r))) {
      problems.push(`${where} 标为 drop 但 cut-list.md 里没有 ${key(r)} 条目`)
    }
  }

  // ---- 第 2 档：绑定 manifest ----
  const elements = manifest?.elements || []
  const byId = new Map(elements.map((e) => [e.id, e]))
  const claimed = new Set(ranges.map((r) => r.owner))
  if (mode !== 'structure' && elements.length) {
    for (const r of ranges) {
      if (r.type === 'drop') continue
      if (!byId.has(r.owner))
        problems.push(`${key(r)} 的归属 ${r.owner} 不在 design/manifest.json 里`)
    }
    // 派生元素（端口、用例、适配器）本来就没有源码行——它们的可追溯性来自 derivedFrom + rationale，
    // 由 D14 逐条核对。所以"没有行来源"只在两者都缺时才算凭空造。
    const derived = (e) => {
      const d = [].concat(e.derivedFrom ?? []).filter(Boolean)
      return d.length > 0 && String(e.rationale || '').trim().length >= 10
    }
    const orphans = elements
      .filter((e) => !NO_LINE_KINDS.has(e.kind))
      .filter((e) => !derived(e))
      .map((e) => e.id)
      .filter((id) => !claimed.has(id))
    if (orphans.length) {
      problems.push(
        `${orphans.length} 个元素既没有行来源、也没写 rationale + derivedFrom（凭空造的设计）：${orphans.slice(0, 4).join(', ')}`,
      )
    }
  }

  // ---- 第 3 档：落地 ----
  if (mode === 'landed' && elements.length) {
    const boundIds = boundIdsOf(manifest)
    const missing = new Set()
    for (const r of ranges) {
      if (r.type === 'drop' || r.type === 'infra') continue
      const el = byId.get(r.owner)
      if (!el) continue
      if (!el.landing) {
        missing.add(`${r.owner} 缺 landing（实现落在哪个文件）`)
        continue
      }
      const f = resolve(root, el.landing)
      if (!existsSync(f)) {
        missing.add(`${r.owner} 的 landing 文件不存在：${el.landing}`)
        continue
      }
      // 同一个文件可能既是元素落点又是组件落点（`D-U-06` 与 `C-04` 是同一个 .tsx），
      // 所以组件/hook/store 的 id 也认——否则只能往文件里塞第二个重复标记
      const aliases = [r.owner, ...(boundIds.get(r.owner) ?? [])]
      const text = readFileSync(f, 'utf8')
      if (!aliases.some((id) => text.includes(`@design ${id}`))) {
        missing.add(
          `${el.landing} 里没有 \`@design ${r.owner}\`（或绑定到它的组件 id）标记——落地不可反查`,
        )
      }
    }
    problems.push(...missing)
  }

  const covered = ranges.reduce((n, r) => n + (r.b - r.a + 1), 0)
  return {
    ok: problems.length === 0,
    problems,
    totals: {
      ranges: ranges.length,
      lines: covered,
      elements: elements.length,
      claimedElements: claimed.size,
      drops: cuts.length,
      mode,
    },
  }
}

/** 从 state.gods 读取总行数（给 CLI 打印分母） */
export function totalLines(gods) {
  return (gods || []).reduce((n, g) => n + (g.lines || 0), 0)
}

export function readIfExists(p) {
  return existsSync(p) ? readFileSync(p, 'utf8') : ''
}

export { join }
