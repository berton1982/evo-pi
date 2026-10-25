/**
 * conventions — 从**现有代码**提取分层事实，供 P2.5 的 `conventions` 门核对。
 *
 * 为什么必须有个提取器：C-G 试点里我把 6 个 HTTP 适配器写进了 `packages/web/`，
 * 而仓库早已存在 `packages/core/src/session/adapters/`。根因不是判断失误，
 * 是工作流从来没有"读现有代码"这一步——P2.5 要求"从零写架构方案"，
 * 而 `arch/rules.json` 是人手写的，写漏的规则永远抓不到自己。
 *
 * 这里的输出是**事实**（哪个目录存在、有多少文件、样例是谁），
 * 判断留给门：AD 的层表与 `rules.json#layerPaths` 都必须与事实对得上。
 */

import { existsSync, readdirSync, statSync } from 'node:fs'
import { basename, join, relative, sep } from 'node:path'
import { globToRegExp } from './placement.mjs'

/** 已知层名：目录 basename 命中即认作某一层 */
export const KNOWN_LAYERS = [
  'domain',
  'use-cases',
  'ports',
  'adapters',
  'infrastructure',
  'application',
  // web 侧
  'app',
  'shell',
  'features',
  'components',
  'lib',
  'hooks',
  'stores',
]

const SKIP_DIRS = new Set(['node_modules', '.next', 'dist', 'build', '.turbo', 'coverage', '.git'])

/**
 * 默认只扫每个包的 src 目录（packages/<pkg>/src）。
 *
 * 教训：第一版扫整个仓库，第三方克隆目录与技能自身的 lib/ 都被当成
 * "本项目的分层事实"（lib 的头号路径变成
 * 技能脚本目录）——分母错了，结论一定错。
 */
export function defaultScopes(root) {
  const out = []
  let names = []
  try {
    names = readdirSync(join(root, 'packages'))
  } catch {
    return out
  }
  for (const name of names) {
    const src = join(root, 'packages', name, 'src')
    if (existsSync(src)) out.push(src)
  }
  return out
}

/** 递归收集 ts/tsx/mjs 源文件（不进 node_modules/.next/dist） */
export function collectSources(root, limit = 4000) {
  const out = []
  const walk = (dir) => {
    if (out.length >= limit) return
    let names = []
    try {
      names = readdirSync(dir)
    } catch {
      return
    }
    for (const name of names) {
      if (SKIP_DIRS.has(name)) continue
      const p = join(dir, name)
      let st
      try {
        st = statSync(p)
      } catch {
        continue
      }
      if (st.isDirectory()) walk(p)
      else if (/\.(ts|tsx|mjs)$/.test(name) && !/\.test\./.test(name)) out.push(p)
    }
  }
  walk(root)
  return out
}

/**
 * 扫仓库得到"分层事实"：
 * `{ packages: [{ name, path, layers: [{ layer, path, files, lines, samples }] }] }`
 *
 * 层 = 目录 basename ∈ KNOWN_LAYERS。同层名在不同 feature 下会出现多次，
 * 这里按 `layer` 聚合路径集合（例：`packages/core/src/{session,mcp}/domain`）。
 */
export function extractConventions(root, { scopes = null } = {}) {
  const roots = scopes ?? defaultScopes(root)
  const files = roots.flatMap((dir) => collectSources(dir))
  const byLayer = new Map()
  for (const file of files) {
    const rel = relative(root, file).split(sep).join('/')
    const parts = rel.split('/')
    // 从深的往浅的找第一个命中层名的目录
    let layer = null
    for (let i = parts.length - 2; i >= 0; i -= 1) {
      if (KNOWN_LAYERS.includes(parts[i])) {
        layer = parts[i]
        break
      }
    }
    if (!layer) continue
    const idx = parts.lastIndexOf(layer)
    const layerPath = parts.slice(0, idx + 1).join('/')
    const cur = byLayer.get(layer) ?? { layer, paths: new Map(), files: 0, samples: [] }
    cur.files += 1
    const entry = cur.paths.get(layerPath) ?? { path: layerPath, files: 0 }
    entry.files += 1
    cur.paths.set(layerPath, entry)
    if (cur.samples.length < 3) cur.samples.push(rel)
    byLayer.set(layer, cur)
  }

  const layers = [...byLayer.values()]
    .map((l) => ({
      layer: l.layer,
      files: l.files,
      paths: [...l.paths.values()].sort((a, b) => b.files - a.files),
      samples: l.samples,
    }))
    .sort((a, b) => b.files - a.files)

  const packages = [...new Set(files.map((f) => relative(root, f).split('/')[1]))]
    .filter(Boolean)
    .map((name) => {
      const pkgRoot = join(root, 'packages', name)
      return {
        name,
        path: `packages/${name}`,
        exists: existsSync(join(pkgRoot, 'src')),
      }
    })

  return {
    generatedAt: new Date().toISOString(),
    root: 'repo',
    totalFiles: files.length,
    layers,
    packages,
  }
}

/**
 * 门：AD 的层表 + `rules.json#layerPaths` 必须与仓库事实一致。
 *
 * 判据（每条都能给出反例）：
 * 1. `arch/conventions.json` 存在且是提取器产物（有 `totalFiles` 与 `layers`）
 * 2. 事实里至少 3 个层、每层至少 1 个真实路径
 * 3. `rules.json#layerPaths` 的每个值必须能在事实中找到同前缀路径（不是凭空写的）
 * 4. AD 正文提到的层名必须出现在事实里（≥3 个），否则说明 AD 在讲别的仓库
 */
export function checkConventions({
  conventions,
  archText = '',
  layerPaths = null,
  maxAgeDays = 30,
}) {
  const problems = []
  if (!conventions || typeof conventions !== 'object') {
    return {
      ok: false,
      problems: ['缺 arch/conventions.json——先跑 extract-conventions.mjs（规则必须来自仓库事实）'],
      detail: '',
    }
  }
  if (!Array.isArray(conventions.layers) || conventions.layers.length === 0)
    problems.push('conventions.json 没有 layers——不是提取器产物')
  const facts = (conventions.layers ?? []).filter((l) => (l.files ?? 0) > 0)
  if (facts.length < 3) problems.push(`仓库事实里只识别到 ${facts.length} 个层（至少 3 个）`)

  if (conventions.generatedAt) {
    const age = (Date.now() - Date.parse(conventions.generatedAt)) / 86_400_000
    if (Number.isFinite(age) && age > maxAgeDays)
      problems.push(
        `conventions.json 已 ${Math.round(age)} 天未重扫（>${maxAgeDays}），目录可能已经变了`,
      )
  }

  const factPaths = new Set()
  for (const l of facts) for (const p of l.paths ?? []) factPaths.add(p.path)
  const factLayers = new Set(facts.map((l) => l.layer))

  if (layerPaths && typeof layerPaths === 'object') {
    for (const [layer, value] of Object.entries(layerPaths)) {
      const list = Array.isArray(value) ? value : [value]
      for (const raw of list) {
        if (typeof raw !== 'string' || raw === '') continue
        // 两种写法都认：具体目录（相等）或 glob（拿事实路径拼一个假文件去匹配）
        const dir = raw.replace(/\/\*\*.*$/, '').replace(/\/\*$/, '')
        const re = /[*]/.test(raw) ? globToRegExp(raw.endsWith('/**') ? raw : `${raw}/**`) : null
        const hit = [...factPaths].some(
          (p) =>
            p === dir || p.startsWith(`${dir}/`) || (re && (re.test(p) || re.test(`${p}/x.ts`))),
        )
        if (!hit)
          problems.push(
            `layerPaths.${layer} = ${raw} 在仓库事实里找不到（写出来的层路径必须是真实目录）`,
          )
      }
    }
  } else {
    problems.push('rules.json 没有 layerPaths——层路径必须先于落点判定存在')
  }

  const mentioned = [...factLayers].filter((l) => new RegExp(`\\b${l}\\b|${l}`, 'i').test(archText))
  if (archText && mentioned.length < 3)
    problems.push(
      `AD 里只提到 ${mentioned.length} 个真实存在的层（${mentioned.join('/') || '无'}）——架构文档要讲这个仓库的分层`,
    )

  const detail = problems.length
    ? problems.join('；')
    : `${facts.length} 个层（${facts.map((l) => `${l.layer} ${l.files}`).join(' / ')}），layerPaths 全部对得上仓库事实`
  return { ok: problems.length === 0, problems, detail }
}

/** 给 CLI/门用的层路径汇总（去重、按文件数降序） */
export function topLayerPaths(conventions, layer, n = 3) {
  const hit = (conventions?.layers ?? []).find((l) => l.layer === layer)
  if (!hit) return []
  return (hit.paths ?? []).slice(0, n).map((p) => p.path)
}

export { basename }
