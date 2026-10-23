// 规格与测试 ID 的两项机器判据（从上一代 check-spec + check-coverage 合并重写）：
//   1. 决策表里的证据锚点必须可解析（`path:line` 真的存在，且行号不越界）
//   2. 规格里声明的测试 ID 必须在测试文件里真实存在
//   3. 禁词：出现"通常/应该/合理"说明作者在猜，不是在陈述源码事实
//
// 为什么合并：证据与测试 ID 是同一张决策表的两列，分两个脚本会得到两次"部分通过"。

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { columnOf, parseTables, readText, stripCell } from './tables.mjs'

export const BANNED = [
  '通常',
  '应该',
  '合理的',
  '合理地',
  '视情况',
  '默认情况下',
  '一般来说',
  '大概',
  '似乎',
  '酌情',
]

const ANCHOR = /([\w.@~/[\]-]+\.(?:tsx?|jsx?|mjs|cjs|md|json|css|ya?ml))(?::(\d+))?/g

export function parseSpecFile(absPath) {
  const md = readText(absPath) || ''
  const testIds = new Set()
  const anchors = []
  const problems = []

  for (const t of parseTables(md)) {
    const evCol = columnOf(t.header, '证据')
    const idCol = columnOf(t.header, '测试')
    for (const row of t.rows) {
      if (evCol >= 0) {
        for (const m of (row[evCol] || '').matchAll(ANCHOR))
          anchors.push({ file: m[1], line: m[2] ? Number(m[2]) : null })
      }
      if (idCol >= 0) {
        for (const m of (row[idCol] || '').matchAll(/\bT-[A-Za-z0-9-]+/g)) testIds.add(m[0])
      }
    }
  }
  // 非表格里的 T- 声明也算（规格正文里直接写测试 ID）
  for (const m of md.matchAll(/\bT-[A-Za-z0-9-]+/g)) testIds.add(m[0])

  for (const word of BANNED) {
    if (md.includes(word)) problems.push(`出现模糊词「${word}」——规格要陈述源码事实，不要猜`)
  }

  return { testIds: [...testIds], anchors, problems }
}

export function resolveAnchors(anchors, root) {
  const bad = []
  for (const a of anchors) {
    const p = resolve(root, a.file)
    if (!existsSync(p)) {
      bad.push(`${a.file} 不存在`)
      continue
    }
    if (a.line) {
      const lines = readFileSync(p, 'utf8').split('\n').length
      if (a.line > lines) bad.push(`${a.file}:${a.line} 越界（文件只有 ${lines} 行）`)
    }
  }
  return bad
}

/** 在测试文件里找测试 ID；返回缺失的 ID */
export function findMissingTestIds(ids, testDirs, root) {
  const haystack = []
  const walk = (dir) => {
    if (!existsSync(dir)) return
    for (const e of readdirSync(dir)) {
      const p = join(dir, e)
      const st = statSync(p)
      if (st.isDirectory()) {
        if (['node_modules', '.next', 'dist', 'coverage'].includes(e)) continue
        walk(p)
      } else if (/\.(test|spec)\.(ts|tsx|mjs)$/.test(e)) {
        haystack.push(readFileSync(p, 'utf8'))
      }
    }
  }
  for (const d of testDirs) walk(resolve(root, d))
  const blob = haystack.join('\n')
  return ids.filter((id) => !blob.includes(id))
}

/** 一次性跑某个 run 的全部 specs */
export function runSpecGates({ runDir, root = '.', testDirs = [] }) {
  const dir = resolve(runDir, 'specs')
  const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.md')) : []
  if (!files.length) return [{ id: 'SPEC0', ok: false, detail: 'specs/ 为空——R3 必须写端到端规格' }]

  const problems = []
  const allIds = new Set()
  for (const f of files) {
    const { testIds, anchors, problems: p } = parseSpecFile(join(dir, f))
    for (const x of p) problems.push(`${f}: ${x}`)
    for (const id of testIds) allIds.add(id)
    if (!anchors.length) problems.push(`${f}: 决策表没有可解析的 path:line 证据`)
    for (const b of resolveAnchors(anchors, root)) problems.push(`${f}: 证据锚点 ${b}`)
    if (!testIds.length) problems.push(`${f}: 没有声明任何测试 ID`)
  }

  const results = [
    {
      id: 'SPEC1',
      ok: problems.length === 0,
      detail: problems.length ? problems.slice(0, 4).join('；') : `${files.length} 份规格证据完整`,
    },
  ]

  if (testDirs.length) {
    const missing = findMissingTestIds([...allIds], testDirs, root)
    results.push({
      id: 'SPEC2',
      ok: missing.length === 0,
      detail: missing.length
        ? `${missing.length} 个测试 ID 未落地：${missing.slice(0, 6).join(', ')}`
        : `${allIds.size} 个测试 ID 全部落地`,
    })
  }
  return results
}

export { stripCell }
