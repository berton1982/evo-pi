/**
 * 变更传播单（P3）—— 一处砍单/删元素，要改 7 个视图。
 *
 * 起因（C-G 试点实测）：用户一句"Code mode 不迁"，实际要动
 * spec / manifest / components / dynamics / ownership / cut-list / behaviors / registry / plans / 代码
 * 共 10 处，我是靠 `lines`→`drift`→`trace` 轮流报红才补全的——三道门各抓一层，
 * 顺序不同就漏。所以把"影响清单"变成前置产物：先列清单，再逐条打勾。
 *
 * 判据（全部机器可判）：
 *  1) 一旦 `cut-list.md` 有 drop 行或 `contract-delta.md` 有 `CHG-\d`，`changes/` 下至少有 1 份单据；
 *  2) 单据里「视图 / 状态 / 说明」表必须覆盖 REQUIRED_VIEWS 全集；
 *  3) 每行状态只能是 `done` 或 `skip`，`skip` 必须写 ≥10 字理由；
 *  4) `done` 行引用的文件必须真实存在（防止"打了勾但没改"）。
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { columnOf, parseTables, stripCell } from './tables.mjs'

export const REQUIRED_VIEWS = [
  'spec.md',
  'design/manifest.json',
  'design/components.md',
  'design/dynamics.md',
  'ownership.md',
  'cut-list.md',
  'behaviors.md',
  'harness/registry.json',
  'plans/*.md',
  '代码（packages/**）',
]

// 视图名统一去掉 markdown 强调符：文档里写 `代码（packages/**）`，stripCell 会吃掉 `**`，
// 两边不做同一套归一就会出现"我明明写了却报缺视图"（试点真踩过）。
const normView = (v) => String(v).replace(/\*/g, '').trim()
const isDone = (v) => /^done$/i.test(v)
const isSkip = (v) => /^skip$/i.test(v)

export function parseChangeDoc(md) {
  const t = parseTables(md || '').find((x) => columnOf(x.header, '视图') >= 0)
  if (!t) return null
  const viewCol = columnOf(t.header, '视图')
  const statusCol = columnOf(t.header, '状态')
  const noteCol = columnOf(t.header, '说明')
  return t.rows
    .filter((r) => r.some((c) => stripCell(c)))
    .map((r) => ({
      // raw 用来看"是不是集合视图（含 *）"，view 归一后用来对表
      raw: stripCell(r[viewCol] ?? '').replace(/`/g, ''),
      view: normView(stripCell(r[viewCol] ?? '').replace(/`/g, '')),
      status: stripCell(r[statusCol] ?? '').toLowerCase(),
      note: stripCell(r[noteCol] ?? ''),
    }))
}

export function runChangePropagation(runDir, { requireIfDeclared = true } = {}) {
  const dir = resolve(runDir, 'changes')
  const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.md')) : []

  const cutList = existsSync(resolve(runDir, 'cut-list.md'))
    ? readFileSync(resolve(runDir, 'cut-list.md'), 'utf8')
    : ''
  const delta = existsSync(resolve(runDir, 'contract-delta.md'))
    ? readFileSync(resolve(runDir, 'contract-delta.md'), 'utf8')
    : ''
  const declared = /\|\s*drop\s*\|/i.test(cutList) || /CHG-\d+/.test(delta) || /CHG-\d+/.test(cutList)

  if (!files.length) {
    if (declared && requireIfDeclared) {
      return {
        ok: false,
        problems: [
          '有砍单/契约变更，但没有 `changes/CHG-*.md` 变更传播单——先列影响视图清单，再逐条打勾',
        ],
      }
    }
    return { ok: true, detail: '没有砍单/契约变更，无需变更单' }
  }

  const problems = []
  let doneCount = 0
  for (const f of files) {
    const rows = parseChangeDoc(readFileSync(join(dir, f), 'utf8'))
    if (!rows) {
      problems.push(`changes/${f} 没有「视图 / 状态 / 说明」表`)
      continue
    }
    const seen = new Set(rows.map((r) => normView(r.view)))
    const missing = REQUIRED_VIEWS.filter((v) => !seen.has(normView(v)))
    if (missing.length) problems.push(`changes/${f} 缺视图：${missing.slice(0, 4).join('、')}`)
    for (const r of rows) {
      if (isDone(r.status)) {
        doneCount++
        // 打勾必须落到真实文件（`plans/*.md`、`代码（packages/**）` 是集合视图，只要求存在性由其它门保证）
        const isSet = /[*]/.test(r.raw || '') || /packages/.test(r.raw || '')
        const p = isSet ? null : resolve(runDir, r.view)
        if (p && !existsSync(p)) problems.push(`changes/${f} 把 ${r.view} 标成 done，但文件不存在`)
        continue
      }
      if (isSkip(r.status)) {
        if (r.note.length < 10) problems.push(`changes/${f} 跳过 ${r.view} 但没写清理由（≥10 字）`)
        continue
      }
      problems.push(`changes/${f} 的 ${r.view} 状态是「${r.status || '空'}」，只能是 done 或 skip`)
    }
  }
  return {
    ok: problems.length === 0,
    problems,
    detail: `${files.length} 份变更单、${doneCount} 个视图已改（其余显式 skip）`,
  }
}
