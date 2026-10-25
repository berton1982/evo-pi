/**
 * placement — 元素的落点必须落在已声明的层里，且不许出现"明明事实在 core、
 * 却写进了 web"这种落点（C-G 试点的真实事故）。
 *
 * 两种模式：
 * - `plan`（C4）：只判路径形态——文件还不存在，落点可以写未来路径。
 * - `landed`（C5）：文件必须存在，并检查 web 侧客户端文件没有 import
 *   `node:*` 或 `@evo-pi/core/src`（这是 `next build` 那次炸掉的直接原因）。
 */

import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const isWeb = (p) => /(^|\/)packages\/web\//.test(p)
const isAdapterish = (p) => /\/(adapters|infrastructure)\//.test(p)

/** glob → 正则（只支持 `**` / `*` 两种通配，够用且可预测） */
export function globToRegExp(glob) {
  const escaped = glob
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*\//g, '\u0000')
    .replace(/\*\*/g, '\u0001')
    .replace(/\*/g, '[^/]*')
    .replace(/\u0000/g, '(?:.*/)?')
    .replace(/\u0001/g, '.*')
  return new RegExp(`^${escaped}$`)
}

/** 元素落点 → 命中的层名（可能多个，按 layerPaths 顺序） */
export function layerOf(file, layerPaths) {
  const hits = []
  for (const [layer, value] of Object.entries(layerPaths ?? {})) {
    const list = Array.isArray(value) ? value : [value]
    for (const raw of list) {
      if (typeof raw !== 'string' || !raw) continue
      // 目录写法（无通配符）= 该目录及其子孙；带通配符的按 glob 匹配
      const glob = raw.includes('*') ? raw : `${raw.replace(/\/+$/, '')}/**`
      if (globToRegExp(glob).test(file)) {
        hits.push(layer)
        break
      }
    }
  }
  return hits
}

/**
 * @param {object} input
 * @param {Array} input.elements manifest.elements（含 `id` / `file` 或 `landing`）
 * @param {string} input.root 仓库根
 * @param {object} input.layerPaths rules.json#layerPaths
 * @param {'plan'|'landed'} input.mode
 */
export function checkPlacement({ elements = [], root, layerPaths = null, mode = 'plan' }) {
  const problems = []
  if (!layerPaths || Object.keys(layerPaths).length === 0)
    return {
      ok: false,
      problems: ['rules.json 没有 layerPaths——没有层就没有落点判据（先跑 extract-conventions.mjs 再看事实）'],
      totals: { elements: elements.length, checked: 0 },
    }

  // "adapters 住在哪个包"由 layerPaths 自己说：它不在 web 里，就不许 web 出现 adapters 目录
  const adapterPaths = []
  for (const [layer, value] of Object.entries(layerPaths)) {
    if (!/adapter|infrastructure/i.test(layer)) continue
    for (const p of Array.isArray(value) ? value : [value]) if (typeof p === 'string') adapterPaths.push(p)
  }
  const adaptersHomeNotWeb = adapterPaths.length > 0 && adapterPaths.every((p) => !isWeb(p))

  let checked = 0
  for (const e of elements) {
    // 判「要落到哪」而不是「从哪来」：计划阶段 landing 才是落点（e.file 是 pi-web 源路径）
    const file = e.landing ?? e.file
    if (!file || typeof file !== 'string') continue
    checked += 1
    const hits = layerOf(file, layerPaths)
    if (hits.length === 0) {
      problems.push(`${e.id} 落点 ${file} 不在任何层里（layerPaths: ${Object.keys(layerPaths).join('/')}）`)
      continue
    }
    if (e.layer && !hits.includes(e.layer))
      problems.push(`${e.id} 声明层 ${e.layer}，但落点 ${file} 命中的是 ${hits.join('/')}`)

    if (adaptersHomeNotWeb && isWeb(file) && isAdapterish(file))
      problems.push(
        `${e.id} 把 adapters/infrastructure 写进了 web（${file}）——仓库事实里它们在 ${adapterPaths[0]}`,
      )

    if (mode === 'landed') {
      const abs = resolve(join(root, file))
      if (!existsSync(abs)) {
        problems.push(`${e.id} 落点文件不存在：${file}`)
        continue
      }
      if (isWeb(file) && /\.(tsx?|mjs)$/.test(file)) {
        const text = readFileSync(abs, 'utf8')
        const isClient = /^\s*['"]use client['"]/m.test(text)
        const nodeImport = text.match(/from\s+['"](node:[^'"]+)['"]/)
        const srcImport = text.match(/from\s+['"]@evo-pi\/core\/src\//)
        if (nodeImport && isClient)
          problems.push(
            `${e.id} 客户端组件 import 了 ${nodeImport[1]}（${file}）——浏览器 chunk 里没有 node 内置模块，next build 会直接失败`,
          )
        if (srcImport)
          problems.push(
            `${e.id} 直接 import core 源码路径（${file}）——只能走包导出 @evo-pi/core[/子路径]，否则 rootDir/打包边界都会破`,
          )
      }
    }
  }

  return {
    ok: problems.length === 0,
    problems,
    totals: { elements: elements.length, checked },
    detail: problems.length
      ? problems.join('；')
      : `${checked}/${elements.length} 个元素落点都在已声明层里（mode=${mode}）`,
  }
}

/**
 * 运行时归属检查（G-36）：**"谁调用"不是判据，"离开界面还成不成立"才是**。
 *
 * 起因：C-C 的 chat 能力，我把 `domain/` 与 `use-cases/` 整批搬进了
 * `web/src/features/chat/`，理由是"只有浏览器调用"。用户当场指出这违反
 * ADR-0001 的分层——业务规则属 core 的第 1–2 层，web 是第 5 层（UI）。
 * `placement` 门当时不可能报错：`layerPaths` 对 web 写的是 `features/**` 通配，
 * "use-case 住在 features 里"完全合法。缺的是**运行时刻度**，不是路径刻度。
 */
export const RUNTIMES = ['server', 'client', 'both']

const SERVER_HINTS = [/\bnode:fs\b/, /\bnode:path\b/, /from 'node:/, /require\('node:/]
const CLIENT_HINTS = [/from 'react'/, /from 'react-dom/, /'use client'/, /from 'zustand'/]

export function checkRuntimeFit({ elements, root, readFile }) {
  const problems = []
  let checked = 0
  let serverSide = 0
  for (const e of elements) {
    const target = e.landing || e.file
    if (!target) continue
    if (!e.runtime) {
      problems.push(`${e.id} 没有声明 runtime（server/client/both）——落点在 web 还是 core 无从判断`)
      continue
    }
    if (!RUNTIMES.includes(e.runtime)) {
      problems.push(`${e.id} 的 runtime「${e.runtime}」不在闭集 ${RUNTIMES.join(' / ')} 里`)
      continue
    }
    checked++
    const inWeb = target.startsWith('packages/web/')
    const inCore = target.startsWith('packages/core/')
    if (e.runtime === 'server' && inWeb) {
      problems.push(`${e.id} 是服务端规则却落在 web（${target}）——业务规则属 core 的 domain/use-cases，见 ADR-0001`)
    }
    if (e.runtime === 'client' && inCore) {
      problems.push(`${e.id} 是呈现逻辑却落在 core（${target}）——core 不许 import React（ADR-0001 第 5 层）`)
    }
    // 目录形态：use-cases/ 与 domain/ports/ 只许在 core
    if (inWeb && /\/(use-cases|domain\/ports)\//.test(target)) {
      problems.push(`${e.id} 落在 web 的 ${/(use-cases)/.test(target) ? 'use-cases' : 'domain/ports'} 目录——这两处属 core 的 1–2 层`)
    }
    if (e.runtime === 'server') serverSide++
    const src = typeof readFile === 'function' ? readFile(target) : null
    if (src) {
      if (inCore && CLIENT_HINTS.some((re) => re.test(src))) {
        problems.push(`${e.id} 的落点 ${target} 在 core 里却带客户端依赖（react/zustand/'use client'）`)
      }
      if (inWeb && SERVER_HINTS.some((re) => re.test(src))) {
        problems.push(`${e.id} 的落点 ${target} 在 web 里却直接 import node: 模块——该走 API 路由`)
      }
    }
  }
  return {
    ok: problems.length === 0,
    problems,
    detail:
      problems.length === 0
        ? `${checked} 个元素都声明了 runtime 且落点与运行时一致（服务端 ${serverSide} 个）`
        : problems.join('；'),
  }
}
