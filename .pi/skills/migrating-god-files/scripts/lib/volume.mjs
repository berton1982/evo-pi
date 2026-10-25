// 工件体量预算（P5）—— 数据工件可以长，判断型文档不行。
//
// 起因（C-G 试点实测）：2258 行源码产出 3327 行工件，其中
// `symbol-map.md` 840 行只为"逐行填 owner"、`surface.json` + `surface.md` 双份同源、
// `design/dynamics.md` 204 行里 3 张图是把代码翻成图。评审成本全转移给了人。
//
// 所以：
//  1) 判断型文档给"按文件的预算"（不是统一 400 行），超了就是信号不足/该合并；
//  2) 数据工件里 **符号表必须去重**（同名符号只占一行，行号并列）——
//     `symbol-map.md` 与 `evidence/symbols-*.md` 一个是台账一个是原始导出，前者不该是后者的副本；
//  3) `surface.md` 不再产出（JSON 是唯一事实源），出现即为违规。

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'

export const DEFAULTS = { prose: 400, data: 5000 }

/** 判断型文档的按文件预算：行数上限越紧，说明越该用表格而不是段落。 */
export const BUDGETS = {
  'symbol-map.md': 1200,
  'spec.md': 120,
  'behaviors.md': 140,
  'design/components.md': 160,
  'design/dynamics.md': 170,
  'design/quality.md': 60,
  'design/ui.md': 120,
  // parity 的行数 ≈ 行为条数 × 常数 + 固定头（每条行为必须一行，逐条对账）。
  // 90 行在 31 条行为的 R2 上必然红，而它变红的唯一原因是"行为多"——
  // 拿它当密度门会逼人把多条行为并成一行，正好破坏"逐条"这个判据，所以放到 120。
  'parity.md': 120,

  'acceptance.md': 80,
}

const DATA_FILES = new Set(['symbol-map.md', 'surface.json', 'features.md', 'cut-list.md'])

/** 已经废弃但仍可能出现旧文件：出现即违规（避免"双份同源"重新长回来）。 */
const FORBIDDEN = new Set(['surface.md'])

export function isDataArtifact(p) {
  return DATA_FILES.has(basename(p)) || /manifest\.json$/.test(p)
}

/** 符号表去重：同名符号必须只占一行（行号可以并列写）。 */
export function checkSymbolMapUnique(text) {
  const names = (text || '')
    .split('\n')
    .map((l) => l.match(/^\|\s*`([^`]+)`\s*\|/))
    .filter(Boolean)
    .map((m) => m[1])
  const dup = names.filter((n, i) => names.indexOf(n) !== i)
  return {
    ok: dup.length === 0,
    problems: dup.length
      ? [
          `符号表有 ${dup.length} 行重复符号（例：${[...new Set(dup)].slice(0, 3).join('、')}）——同名只应占一行`,
        ]
      : [],
    total: names.length,
    unique: new Set(names).size,
  }
}

export function runVolume(
  runDir,
  { prose = DEFAULTS.prose, data = DEFAULTS.data, godCount = 1, behaviorCount = 0 } = {},
) {
  const problems = []
  const rows = []
  const walk = (dir) => {
    if (!existsSync(dir)) return
    for (const e of readdirSync(dir)) {
      const p = join(dir, e)
      const st = statSync(p)
      if (st.isDirectory()) {
        // evidence/ 是 LSP 导出，harness/snapshot/ 是采集回来的快照（可上万行）——
        // 两者都是"机器产物"，不是人写的判断文档，不该被 400 行判断型上限卡住
        if (['node_modules', '.git', 'evidence', 'snapshot'].includes(e)) continue
        walk(p)
      } else if (/\.(md|json)$/.test(e)) {
        const file = p.replace(`${resolve(runDir)}/`, '')
        const text = readFileSync(p, 'utf8')
        const n = text.split('\n').length
        if (FORBIDDEN.has(basename(p))) {
          problems.push(`${file} 已废弃（JSON 才是唯一事实源，双份同源必然漂移）——删掉它`)
          continue
        }
        let budget = BUDGETS[file.replace(/^.*?(?=design\/)/, '')] ?? BUDGETS[file]
        // symbol-map 是"每个 god 一张台账"，预算必须随 god 数走：
        // C-A 有 4 个 god（7,669 行），把它们塞进 1,200 行等于逼人删符号。
        if (budget && basename(file) === 'symbol-map.md') {
          // 由调用方传入（checks 从 state.gods 取），这里不自己读 state 免得两处口径不一致
          budget = budget * Math.max(1, godCount)
        }
        // parity.md 是"每条行为一行 + 缺口逐条登记"，行数天然随行为数走。
        // 固定 120 行会与 `fidelity`（要求 pi-web 独有元素逐个点名）直接冲突：
        // C-C 57 条行为，逐条登记就是 390 行。所以按 8 行/行为放大下限。
        if (budget && basename(file) === 'parity.md' && behaviorCount > 0) {
          budget = Math.max(budget, behaviorCount * 8)
        }
        const cap = budget ?? (isDataArtifact(p) ? data : prose)
        rows.push({ file, lines: n, cap })
        if (n > cap) {
          const kind = budget ? '按文件预算' : isDataArtifact(p) ? '数据上限' : '判断型上限'
          problems.push(`${file} ${n} 行 > ${cap}（${kind}）`)
        }
        if (basename(p) === 'symbol-map.md') {
          const uniq = checkSymbolMapUnique(text)
          if (!uniq.ok) problems.push(...uniq.problems)
        }
      }
    }
  }
  walk(resolve(runDir))
  return { ok: problems.length === 0, problems, rows }
}
