// 外部 IO 追踪：god 文件自己不写 `fetch` 时，契约需求会整体隐身。
//
// 为什么需要这道检查：`McpConfig.tsx`（2258 行）里**一次 `fetch` 都没有**——所有读写都通过
// `./SettingsUi` 导入的 `loadMcpOverview` / `saveMcpCodemodeMode` / `testMcpServer` 走。
// 表面枚举只能看到本文件，于是 C2 的 `contractInventory` 报"没有可对账项"直接绿——
// 与 G-10 同源的剧场：**分母是空的，所以永远达标**。
//
// 判据：沿 import 追 maxDepth 层，凡能追到 `/api/...` 的模块都要在
// `contract-delta.md` 的「外部依赖」表里登记；追到的每条路径都必须在 wire 契约里。

import { existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, isAbsolute, join, resolve } from 'node:path'

const EXT = ['.ts', '.tsx', '/index.ts', '/index.tsx', '.js', '.mjs']
const SKIP_SPEC = /^(node:|@earendil-works\/|react$|react-dom)/
const API_PATH = /\/api\/[A-Za-z0-9\-_/[\]]*/g

/** 读源码里所有 `from "..."` 的模块说明符（跳过 `import type`） */
export function collectImports(text) {
  const out = []
  const re = /(^|\n)\s*import\s+(type\s+)?[\s\S]*?from\s+["']([^"']+)["']/g
  let m = re.exec(text)
  while (m) {
    if (!m[2]) out.push(m[3])
    m = re.exec(text)
  }
  return [...new Set(out)]
}

/** 把 `./X`、`@/lib/X` 解析成真实文件；解析不到返回 null（当作外部包） */
export function resolveModule(fromFile, spec, root) {
  if (SKIP_SPEC.test(spec)) return null
  let base
  if (spec.startsWith('.')) base = resolve(dirname(fromFile), spec)
  else if (spec.startsWith('@/')) base = join(root, spec.slice(2))
  else return null
  for (const ext of EXT) {
    const p = `${base}${ext}`
    if (existsSync(p) && statSync(p).isFile()) return p
  }
  return null
}

/** 抽 `/api/...` 路径（去掉模板插值与查询串） */
export function apiPathsIn(text) {
  const hits = text.match(API_PATH) || []
  return [
    ...new Set(
      hits
        .map((p) =>
          p
            .replace(/\$\{[^}]*\}/g, '')
            .replace(/[),.;:'"`]+$/, '')
            .replace(/\/$/, ''),
        )
        .filter((p) => p.length > 5),
    ),
  ]
}

/**
 * 从 god 文件出发 BFS 追 import。
 * 返回 `{ modules: [{ file, spec, depth, apiPaths, importedFrom }], apiPaths: [] }`
 * 只保留 `apiPaths.length > 0` 的模块——没有 HTTP 的模块不需要进契约。
 */
export function scanExternalIo({ godPath, root, maxDepth = 2 }) {
  const god = resolve(godPath)
  const seen = new Map()
  const queue = [{ file: god, depth: 0, via: god }]
  const apiHits = new Map()
  while (queue.length) {
    const cur = queue.shift()
    if (cur.depth > maxDepth) continue
    if (seen.has(cur.file) && seen.get(cur.file).depth <= cur.depth) continue
    const text = readFileSync(cur.file, 'utf8')
    seen.set(cur.file, { file: cur.file, depth: cur.depth, via: cur.via })
    if (cur.depth > 0) {
      const paths = apiPathsIn(text)
      if (paths.length) {
        const prev = apiHits.get(cur.file) || {
          file: cur.file,
          spec: cur.via,
          depth: cur.depth,
          apiPaths: [],
        }
        prev.apiPaths = [...new Set([...prev.apiPaths, ...paths])]
        apiHits.set(cur.file, prev)
      }
    }
    for (const spec of collectImports(text)) {
      const next = resolveModule(cur.file, spec, root)
      if (next) queue.push({ file: next, depth: cur.depth + 1, via: spec })
    }
  }
  const modules = [...apiHits.values()]
  const apiPaths = [...new Set(modules.flatMap((m) => m.apiPaths))].sort()
  return { modules, apiPaths }
}

/** 解析 contract-delta.md 的「外部依赖」表：模块 → 契约指向 */
export function parseExternalTable(md) {
  const rows = []
  const lines = (md || '').split('\n')
  let inTable = false
  let header = null
  for (const line of lines) {
    if (/^##+\s*外部依赖/.test(line.trim())) {
      inTable = true
      continue
    }
    if (inTable && /^##+\s/.test(line.trim())) {
      inTable = false
      continue
    }
    if (!inTable) continue
    if (!line.trim().startsWith('|')) continue
    const cells = line
      .split('|')
      .slice(1, -1)
      .map((c) => c.trim())
    if (!header) {
      header = cells
      continue
    }
    if (cells.every((c) => /^:?-+:?$/.test(c))) continue
    rows.push(Object.fromEntries(header.map((h, i) => [h, cells[i] || ''])))
  }
  return rows
}

/**
 * C2 的外部 IO 判据。
 * - 追到的每个模块必须在「外部依赖」表里出现（按模块说明符或文件名匹配）
 * - 追到的每条 `/api/...` 必须在 wire 契约里出现
 */
export function checkExternalIo({ godPath, root, contractDelta, wireText }) {
  const scan = scanExternalIo({ godPath, root })
  const problems = []
  if (!scan.modules.length)
    return {
      ok: true,
      problems: [],
      modules: [],
      apiPaths: [],
      note: '本文件及其 2 层 import 里没有 /api/ 调用',
    }

  const rows = parseExternalTable(contractDelta)
  const listed = rows.map((r) => Object.values(r).join(' ')).join('\n')

  for (const mod of scan.modules) {
    const name = mod.file.split('/').pop()
    const spec = mod.spec.replace(/^\.\//, '')
    if (!listed.includes(name) && !listed.includes(spec))
      problems.push(
        `模块 ${mod.file.split('/web/')[1] || mod.file} 里有 HTTP 调用（${mod.apiPaths.join(', ')}），但 contract-delta.md 的「外部依赖」表没登记它`,
      )
  }

  const wire = wireText || ''
  const missing = scan.apiPaths.filter((p) => !wire.includes(p))
  if (missing.length)
    problems.push(
      `沿 import 追到 ${missing.length} 条命令不在 wire 契约里：${missing.slice(0, 4).join(', ')}`,
    )

  return {
    ok: problems.length === 0,
    problems,
    modules: scan.modules.map((m) => ({ file: m.file, depth: m.depth, count: m.apiPaths.length })),
    apiPaths: scan.apiPaths,
    detail: `${scan.modules.length} 个外部模块、${scan.apiPaths.length} 条命令已登记并对上契约`,
  }
}

export function isAbsolutePath(p) {
  return isAbsolute(p)
}
