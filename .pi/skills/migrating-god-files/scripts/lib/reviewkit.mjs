/**
 * reviewkit — 代码评审的**可核对部分**。
 *
 * 背景：C-G 试点的 `review.md` 39 行、22 行表格全是自述（"依赖方向 ✅"），
 * 而 `review` 门只判「文件存在 + 两个标题 + 全文无 ❌」。用户看不出该 review 什么。
 *
 * 这里做两件事：
 * 1. `measureFiles`：从真实源码里量出 god file 迹象（行数、状态数、副作用数、嵌套深度、any）。
 * 2. `checkReview`：12 项固定清单，每项必须 `pass` / `fix` / `na`；
 *    度量发现的问题必须在清单里出现 `fix` 并给出 `文件:行`——否则门红。
 *
 * 不做的事：判断"架构是否合理""命名是否恰当"。这些留在人签（humanSignoff）。
 */

import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

/** 12 项固定清单（顺序稳定，便于 diff） */
export const REVIEW_ITEMS = [
  '单一职责',
  '文件体量',
  '函数体量',
  '嵌套深度',
  '参数与 props',
  '依赖方向',
  '错误处理',
  '命名与注释',
  '测试覆盖',
  '可访问性与交互态',
  '副作用与竞态',
  '死代码与重复',
]

/** 度量 → 清单项的映射：度量的红必须落到对应项上 */
export const FINDING_TO_ITEM = {
  'oversize-file': '文件体量',
  'oversize-function': '函数体量',
  'too-many-state': '单一职责',
  'too-many-effects': '副作用与竞态',
  'deep-nesting': '嵌套深度',
  'any-type': '命名与注释',
  'many-props': '参数与 props',
}

export const DEFAULT_LIMITS = {
  fileLines: 400,
  functionLines: 60,
  useState: 4,
  useEffect: 3,
  nesting: 4,
  props: 8,
  anyType: 0,
}

const stripComments = (text) =>
  text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/g, '$1')

/** 单个文件的度量 */
export function measureSource(text, limits = DEFAULT_LIMITS) {
  const code = stripComments(text)
  const lines = text.split('\n').length
  const useState = (code.match(/\buseState\s*\(/g) ?? []).length
  const useEffect = (code.match(/\buseEffect\s*\(/g) ?? []).length
  const anyType = (code.match(/:\s*any\b|as\s+any\b/g) ?? []).length

  // 嵌套深度 = 控制流嵌套（if/for/while/switch/catch/else 的缩进层级）。
  // 为什么不用花括号深度：对象字面量、JSX 属性、模板串里的 `{}` 会虚增 2–3 层
  // （第一版把只有 3 层控制流的批处理用例报成 5 层、把 JSX 列表报成 6–7 层）。
  // 代码经 prettier 格式化，2 空格缩进稳定，用缩进推层级比数括号更贴近"读起来有几层"。
  // 只数**开块**的控制流（行尾是 `{` 或 `=> {`）；单行守卫 `if (x) return y` 不算嵌套——
  // 它是减少嵌套的写法，把它算成一层会奖励"多写 else"。
  let nesting = 0
  for (const line of code.split('\n')) {
    const m = line.match(/^(\s*)(?:if|for|while|switch|catch|else)\b.*\{\s*$/)
    if (!m) continue
    nesting = Math.max(nesting, Math.floor(m[1].length / 2))
  }

  // 最长函数体：从 `function x(...) {` / `(...) => {` 起算到同深度收尾
  let maxFn = 0
  const starts = [...code.matchAll(/(?:function\s+\w+\s*\(|=>\s*\{)/g)].map((m) => m.index ?? 0)
  for (const start of starts) {
    let d = 0
    let started = false
    let len = 0
    for (let i = start; i < code.length; i += 1) {
      const ch = code[i]
      if (ch === '{') {
        d += 1
        started = true
      } else if (ch === '}') {
        d -= 1
        if (started && d === 0) {
          len = code.slice(start, i).split('\n').length
          break
        }
      }
    }
    if (len > maxFn) maxFn = len
  }

  const findings = []
  if (lines > limits.fileLines)
    findings.push({ kind: 'oversize-file', value: lines, limit: limits.fileLines })
  if (maxFn > limits.functionLines)
    findings.push({ kind: 'oversize-function', value: maxFn, limit: limits.functionLines })
  if (useState > limits.useState)
    findings.push({ kind: 'too-many-state', value: useState, limit: limits.useState })
  if (useEffect > limits.useEffect)
    findings.push({ kind: 'too-many-effects', value: useEffect, limit: limits.useEffect })
  if (nesting > limits.nesting)
    findings.push({ kind: 'deep-nesting', value: nesting, limit: limits.nesting })
  if (anyType > limits.anyType)
    findings.push({ kind: 'any-type', value: anyType, limit: limits.anyType })

  return { lines, maxFn, useState, useEffect, nesting, anyType, findings }
}

/**
 * 量一批落点文件。`files` 是仓库相对路径；缺失文件跳过（`placement` 门负责报缺）。
 */
export function measureFiles({ root, files = [], limits = DEFAULT_LIMITS }) {
  const out = []
  for (const file of files) {
    if (!file || typeof file !== 'string') continue
    const abs = resolve(join(root, file))
    if (!existsSync(abs)) continue
    const text = readFileSync(abs, 'utf8')
    const m = measureSource(text, limits)
    if (m.findings.length) out.push({ file, ...m })
  }
  return out
}

/** 解析 review.md 的检查清单表 */
export function parseReviewTable(md) {
  const rows = []
  for (const line of String(md ?? '').split('\n')) {
    const cells = line.split('|').map((c) => c.trim())
    if (cells.length < 5) continue
    const item = cells[1]
    const verdict = cells[2]
    const evidence = cells[3]
    if (!item || /^-+$/.test(item) || /^项$|^检查项$/.test(item)) continue
    rows.push({ item, verdict, evidence })
  }
  return rows
}

/**
 * @param {object} input
 * @param {string} input.md review.md 内容
 * @param {Array} input.findings measureFiles 的产出
 */
export function checkReview({ md, findings = [], requireItems = REVIEW_ITEMS }) {
  const problems = []
  const rows = parseReviewTable(md ?? '')
  if (rows.length === 0)
    return {
      ok: false,
      problems: ['没有解析到检查清单（表头：| 检查项 | 结论 | 证据 |）'],
      totals: { rows: 0 },
    }

  const byItem = new Map()
  for (const r of rows) {
    if (byItem.has(r.item)) problems.push(`检查项「${r.item}」出现多次`)
    byItem.set(r.item, r)
  }

  for (const item of requireItems) {
    if (!byItem.has(item)) problems.push(`清单缺「${item}」`)
  }

  for (const [item, r] of byItem) {
    const verdict = (r.verdict ?? '').toLowerCase()
    if (!['pass', 'fix', 'na'].includes(verdict)) {
      problems.push(`「${item}」结论必须是 pass/fix/na（实际：${r.verdict || '空'}）`)
      continue
    }
    if (verdict === 'fix' && !/[\w./@-]+\.[a-z]+:\d+/.test(r.evidence ?? ''))
      problems.push(`「${item}」标了 fix 但证据里没有 文件:行（实际：${r.evidence || '空'}）`)
    if (verdict === 'na' && (r.evidence ?? '').trim().length < 10)
      problems.push(`「${item}」标了 na 必须写理由（≥10 字）`)
  }

  // 度量与清单必须对得上：量出来的问题不能"一条都没提"
  const violations = findings.flatMap((f) => f.findings.map((x) => ({ file: f.file, ...x })))
  for (const v of violations) {
    const item = FINDING_TO_ITEM[v.kind] ?? null
    const row = item ? byItem.get(item) : null
    const mentionsFile = row && (row.evidence ?? '').includes(v.file)
    if (!row || (row.verdict ?? '').toLowerCase() === 'pass' || !mentionsFile)
      problems.push(
        `度量发现 ${v.file} 的${item ?? v.kind}超限（${v.value} > ${v.limit}），但清单「${item ?? v.kind}」没有写 fix + 该文件`,
      )
  }

  return {
    ok: problems.length === 0,
    problems,
    totals: {
      rows: rows.length,
      fix: rows.filter((r) => (r.verdict ?? '').toLowerCase() === 'fix').length,
      violations: violations.length,
    },
  }
}
