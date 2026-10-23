// Markdown 表格解析——设计门与行为门都靠它把「文档」变成「数据」。
//
// 为什么不用正则逐行匹配：表格有列顺序变化、单元格含 `|` 转义、跨节多个表。
// 先切表再按表头取列，比"猜第几列"稳。

import { existsSync, readFileSync } from 'node:fs'

export function readText(p) {
  return existsSync(p) ? readFileSync(p, 'utf8') : null
}

/** 从 markdown 文本里切出所有表格：{ header: string[], rows: string[][] } */
export function parseTables(md) {
  const lines = md.split('\n')
  const tables = []
  let i = 0
  while (i < lines.length) {
    if (!lines[i].trim().startsWith('|')) {
      i++
      continue
    }
    const block = []
    while (i < lines.length && lines[i].trim().startsWith('|')) {
      block.push(lines[i])
      i++
    }
    if (block.length < 2) continue
    const cut = (line) =>
      line
        .trim()
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map((c) => c.trim())
    const header = cut(block[0])
    if (!block[1].includes('-')) continue
    const rows = block
      .slice(2)
      .map(cut)
      .filter((r) => r.some((c) => c.length))
    tables.push({ header, rows })
  }
  return tables
}

export function stripCell(v) {
  return (v || '').replace(/`/g, '').replace(/\*\*/g, '').trim()
}

/** 按表头名取列（模糊：header 包含 name 即可）；取不到返回 -1 */
export function columnOf(header, name) {
  const want = name.toLowerCase()
  return header.findIndex((h) => stripCell(h).toLowerCase().includes(want))
}

/** 取第一张含指定列名的表 */
export function tableWith(md, ...names) {
  for (const t of parseTables(md)) {
    if (names.every((n) => columnOf(t.header, n) >= 0)) return t
  }
  return null
}

/** 从一个单元格里提取反引号里的标识符（god 文件名等） */
export function backticked(cell) {
  return [...(cell || '').matchAll(/`([^`]+)`/g)].map((m) => m[1].trim())
}
