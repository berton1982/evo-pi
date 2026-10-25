// 符号级对账——行区间只证明"这段有人认领"，符号级才证明"每个声明都没丢"。
//
// 为什么需要两层：一个 200 行的区间可以标成"归 F-01"，但里面 12 个声明可能只实现 3 个。
// 行覆盖 ≠ 符号覆盖。上一代技能的 check-parity 就是干这件事的，这里重写并补两次测试。
//
// 输入：
//   符号全集  evidence/symbols-<god>.md —— LSP code_resolve 导出的 bullet 列表
//   对账表    symbol-map.md           —— 每个符号一行：行号 / 归属 / evo 落点 / 状态 / 理由
// 判据：
//   1. 符号全集里的每个符号在 map 里有条目（缺失 = 漏读）
//   2. map 里的符号在符号全集里存在（多余 = 过期条目）
//   3. 状态为 done/已落地 的，落点文件必须存在（否则 = 虚报）
//   4. 状态为 drop/不迁/out-of-scope 的，必须有理由

import { existsSync, readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { columnOf, parseTables, stripCell } from './tables.mjs'

const DONE = new Set(['done', 'done ', '已落地', '完成', '已完成'])
const DROP = new Set(['drop', 'out-of-scope', '不迁', '不做', 'excluded'])

/** 解析 LSP 导出：`- **Name** (Kind) in \`Scope\` — \`path:line:col\`` */
export function parseSymbols(md) {
  const out = []
  for (const line of (md || '').split('\n')) {
    const m = line.match(/^\s*[-*]\s*\*\*(.+?)\*\*/)
    if (!m) continue
    const name = m[1].trim()
    const scope = (line.match(/in\s+`([^`]+)`/) || [])[1] || null
    const m2 = line.match(/`([^`]+\.(?:tsx?|ts|mjs)):(\d+)/)
    // 行号必须保留：丢掉它，symbol-map 的「行号」列就永远是「—」，
    // 后面靠行号做的交叉核对（符号 ↔ 归属区间）全部失效。
    out.push({ name, scope, file: m2 ? m2[1] : null, line: m2 ? Number(m2[2]) : null })
  }
  return out
}

/** 解析 symbol-map.md：返回 [{ name, line, owner, target, status, reason }] */
export function parseSymbolMap(md) {
  const out = []
  for (const t of parseTables(md || '')) {
    const nameCol = columnOf(t.header, '符号')
    if (nameCol < 0) continue
    const lineCol = columnOf(t.header, '行号')
    const ownerCol = columnOf(t.header, '归属')
    const targetCol = columnOf(t.header, '落点')
    const statusCol = columnOf(t.header, '状态')
    const reasonCol = columnOf(t.header, '理由')
    // 多 god 的 run 共用一张对账表：没有「文件」列就无法区分同名符号属于哪个文件，
    // 逐 god 校验会把别的文件的符号全判成"过期"（20261024-C-A-runtime 实测 1337 条误报）。
    const fileCol = columnOf(t.header, '文件')
    for (const row of t.rows) {
      const nameCols = [...(row[nameCol] || '').matchAll(/`([^`]+)`/g)].map((m) => m[1])
      const name = nameCols[0] || stripCell(row[nameCol])
      if (!name) continue
      out.push({
        name,
        line: lineCol >= 0 ? stripCell(row[lineCol]) : '',
        owner: ownerCol >= 0 ? stripCell(row[ownerCol]) : '',
        target: targetCol >= 0 ? stripCell(row[targetCol]) : '',
        status: statusCol >= 0 ? stripCell(row[statusCol]).toLowerCase() : '',
        reason: reasonCol >= 0 ? stripCell(row[reasonCol]) : '',
        file: fileCol >= 0 ? stripCell(row[fileCol]).replace(/`/g, '') : '',
      })
    }
  }
  return out
}

export function runSymbolParity({ symbolsText, mapText, root = '.', godFile = null }) {
  const symbols = parseSymbols(symbolsText)
  const all = parseSymbolMap(mapText)
  // 有「文件」列且指定了 god → 只比这个文件的行；否则退回"整表对该 god"的旧行为
  const scoped = godFile && all.some((r) => r.file)
  // 去扩展名再比：`symbols-Fixture.md` 的 fileBase 是 `Fixture`，而 god 的 basename 是 `Fixture.tsx`
  const strip = (x) => String(x || '').replace(/\.[a-z]+$/i, '')
  const rows = scoped
    ? all.filter(
        (r) => strip(r.file) === strip(godFile) || strip(r.file).endsWith(`/${strip(godFile)}`),
      )
    : all
  const problems = []
  if (!symbols.length) {
    problems.push('符号全集为空或格式不符（需要 `- **Name** (Kind) …` 的 bullet 列表）')
  }
  if (!rows.length) problems.push('symbol-map.md 里没有解析到任何符号行')

  const mapNames = new Set(rows.map((r) => r.name))
  const symNames = new Set(symbols.map((s) => s.name))
  const missing = [...symNames].filter((n) => !mapNames.has(n))
  const ghost = [...mapNames].filter((n) => !symNames.has(n))

  if (missing.length)
    problems.push(`${missing.length} 个符号未对账：${missing.slice(0, 5).join(', ')}`)
  if (ghost.length)
    problems.push(`${ghost.length} 个条目在源码里不存在（过期）：${ghost.slice(0, 5).join(', ')}`)

  const doneButMissing = []
  const dropNoReason = []
  for (const r of rows) {
    if (DONE.has(r.status) && r.target && /^[\w./-]+\.(ts|tsx|mjs)$/.test(r.target)) {
      if (!existsSync(resolve(root, r.target))) doneButMissing.push(`${r.name} → ${r.target}`)
    }
    if (DROP.has(r.status) && !r.reason) dropNoReason.push(r.name)
  }
  if (doneButMissing.length) {
    problems.push(
      `${doneButMissing.length} 个标为已落地但落点不存在：${doneButMissing.slice(0, 3).join('；')}`,
    )
  }
  if (dropNoReason.length) {
    problems.push(
      `${dropNoReason.length} 个标为不迁但没有理由：${dropNoReason.slice(0, 5).join(', ')}`,
    )
  }

  return {
    ok: problems.length === 0,
    totals: {
      symbols: symNames.size,
      mapped: mapNames.size,
      missing: missing.length,
      ghost: ghost.length,
      doneButMissing: doneButMissing.length,
      dropNoReason: dropNoReason.length,
    },
    problems,
  }
}

/**
 * 符号全集文件：约定 `evidence/symbols-<无扩展名>.md`。
 * 但 `enumerate-symbols.mjs --out` 很容易被写成 `symbols-SkillsConfig.tsx.md`（带扩展名），
 * 试运行时就是这样：文件存在、C1 的 glob 通过、可 `symbolsFileFor` 找不到 → 报"缺符号全集"，
 * 而错误信息没提命名约定，人会去查是不是没导出。所以这里两种都认。
 */
export function symbolsFileFor(runDir, godBasename) {
  const base = godBasename.replace(/\.(tsx?|mjs|jsx?)$/, '')
  const bare = resolve(runDir, 'evidence', `symbols-${base}.md`)
  if (existsSync(bare)) return bare
  const withExt = resolve(runDir, 'evidence', `symbols-${godBasename}.md`)
  return existsSync(withExt) ? withExt : bare
}

/**
 * 符号全集的采集证据（`symbols-*.meta.json`，由 enumerate-symbols.mjs 写）。
 *
 * 为什么单独要这个文件：`state.json` 里的 `symbolSource:'LSP'` 是人自己填的字符串，
 * 试点第一轮 TypeScript 是 7 原生发行版（没有 tsserver.js）时，175 条声明照样被记成
 * "LSP"、C1 全绿。现在门只认采集侧留下的机器记录：模式、tsserver 路径、工程、条数。
 */
export function symbolsMetaFor(runDir, godBasename) {
  const md = symbolsFileFor(runDir, godBasename)
  const metaPath = md.replace(/\.md$/, '.meta.json')
  if (!existsSync(metaPath)) return { path: metaPath, meta: null }
  try {
    return { path: metaPath, meta: JSON.parse(readFileSync(metaPath, 'utf8')) }
  } catch {
    return { path: metaPath, meta: null }
  }
}

export function readOrNull(p) {
  return existsSync(p) && statSync(p).isFile() ? readFileSync(p, 'utf8') : null
}
