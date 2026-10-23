// 设计门的执行器（D1–D10 + 表面认领 + 质量预算 + 漂移反查）。
//
// 为什么设计要机器可判：v1 的教训是「文档写得漂亮但没人验」。
// 这里把设计压成 design/manifest.json（结构化），散文只做解释。
// 设计的正确性可以被集合运算证明的部分，全部做成门；不能证明的（模式是否恰当）压成
// 「必须有观察到的症状 + 被否方案 + 错判成本」，由人判断，但**缺字段即红**。

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { columnOf, parseTables, readText, stripCell } from './tables.mjs'

// 每个 R 级需要跑的设计门。理由：R1 是独立设置页，写时序图属于浪费。
const GATES_BY_LEVEL = {
  R1: ['D2', 'D3', 'D8', 'D9', 'D11', 'D12', 'D13', 'D14', 'D16', 'D17', 'D18', 'D19'],
  R2: [
    'D1',
    'D2',
    'D3',
    'D4',
    'D7',
    'D8',
    'D9',
    'D10',
    'D11',
    'D12',
    'D13',
    'D14',
    'D16',
    'D17',
    'D18',
  ],
  R3: [
    'D1',
    'D2',
    'D3',
    'D4',
    'D5',
    'D6',
    'D7',
    'D8',
    'D9',
    'D10',
    'D11',
    'D12',
    'D13',
    'D14',
    'D16',
    'D17',
    'D18',
  ],
}

const BANNED_WORDS = ['通常', '应该', '合理', '尽量', '大概', '视情况']

export function loadJson(p) {
  if (!existsSync(p)) return null
  try {
    return JSON.parse(readFileSync(p, 'utf8'))
  } catch {
    return null
  }
}

export function loadManifest(runDir) {
  return loadJson(resolve(runDir, 'design/manifest.json'))
}

/** 解析 behaviors.md：返回 [{ id, script, evidence, surface, cells }] */
export function parseBehaviors(md) {
  if (!md) return []
  const out = []
  for (const t of parseTables(md)) {
    const idCol = columnOf(t.header, 'id')
    if (idCol < 0) continue
    const scriptCol = columnOf(t.header, 'script')
    const evCol = columnOf(t.header, '证据')
    const sfCol = columnOf(t.header, '表面')
    for (const row of t.rows) {
      const id = stripCell(row[idCol])
      if (!/^B-[\w-]+$/.test(id)) continue
      out.push({
        id,
        script: scriptCol >= 0 ? stripCell(row[scriptCol]) : '',
        evidence: evCol >= 0 ? stripCell(row[evCol]) : '',
        surface: sfCol >= 0 ? stripCell(row[sfCol]) : '',
        cells: row,
      })
    }
  }
  return out
}

function ids(elements) {
  return new Set((elements || []).map((e) => e.id))
}

function nonEmpty(arr) {
  return Array.isArray(arr) && arr.filter(Boolean).length > 0
}

// ── 单项门 ──────────────────────────────────────────────

function d1Coverage(manifest, behaviors) {
  const behaviorIds = new Set(behaviors.map((b) => b.id))
  const covered = new Set()
  for (const el of manifest.elements || []) for (const b of el.behaviors || []) covered.add(b)
  const unowned = [...behaviorIds].filter((b) => !covered.has(b))
  const ghost = [...covered].filter((b) => !behaviorIds.has(b))
  const problems = []
  if (unowned.length)
    problems.push(`${unowned.length} 条行为没有设计元素：${unowned.slice(0, 3).join(', ')}`)
  if (ghost.length)
    problems.push(`${ghost.length} 个设计引用不存在的行为：${ghost.slice(0, 3).join(', ')}`)
  return {
    id: 'D1',
    ok: problems.length === 0,
    detail: problems.join('；') || `${behaviorIds.size} 条行为双向闭合`,
  }
}

function d2Surfaces(manifest, surface) {
  const owned = new Set([
    ...Object.keys(manifest.surfaces || {}),
    ...Object.keys(manifest.excluded || {}),
  ])
  const all = (surface?.entries || []).map((e) => e.id)
  if (!all.length)
    return { id: 'D2', ok: false, detail: 'surface.json 为空——先跑 enumerate-surface' }
  const unclaimed = all.filter((id) => !owned.has(id))
  const ghost = [...owned].filter((id) => !all.includes(id))
  // 只报"75 个表面点全部认领"是自欺：i18n 50 条与交互 12 条不是一个难度。
  // 按 kind 分账后，"全部认领"才是可读的结论（职责全库唯一）。
  const byKind = {}
  for (const e of surface?.entries || []) {
    const kind = e.kind || 'unknown'
    if (!byKind[kind]) byKind[kind] = { total: 0, claimed: 0 }
    byKind[kind].total += 1
    if (owned.has(e.id)) byKind[kind].claimed += 1
  }
  const problems = []
  if (unclaimed.length)
    problems.push(
      `${unclaimed.length}/${all.length} 个表面点无归属：${unclaimed.slice(0, 3).join(', ')}`,
    )
  if (ghost.length)
    problems.push(`${ghost.length} 个归属指向不存在的表面点：${ghost.slice(0, 3).join(', ')}`)
  const ledger = Object.entries(byKind)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([kind, v]) => `${kind} ${v.claimed}/${v.total}`)
    .join('、')
  return {
    id: 'D2',
    ok: problems.length === 0,
    detail: problems.join('；') || `${all.length} 个表面点全部认领（${ledger}）`,
  }
}

function d3States(manifest) {
  const el = ids(manifest.elements)
  const seen = new Set()
  const problems = []
  for (const s of manifest.states || []) {
    if (!s.key) problems.push('state 缺 key')
    else if (seen.has(s.key)) problems.push(`state「${s.key}」有多个条目（应只有一个 owner）`)
    else seen.add(s.key)
    if (s.owner && !el.has(s.owner)) problems.push(`state「${s.key}」owner ${s.owner} 不存在`)
    if (!s.owner) problems.push(`state「${s.key}」没有 owner`)
  }
  if (!(manifest.states || []).length) problems.push('manifest.states 为空')
  return {
    id: 'D3',
    ok: problems.length === 0,
    detail: problems.slice(0, 4).join('；') || `${seen.size} 个 state 唯一归属`,
  }
}

function d4Ports(manifest) {
  const el = ids(manifest.elements)
  const problems = []
  const useCaseOwners = new Set()
  for (const p of manifest.ports || []) {
    if (!p.id) problems.push('port 缺 id')
    if (!nonEmpty(p.consumers)) problems.push(`port ${p.id} 没有消费者`)
    for (const c of p.consumers || [])
      if (!el.has(c)) problems.push(`port ${p.id} 的消费者 ${c} 不存在`)
    if (!nonEmpty(p.methods)) problems.push(`port ${p.id} 没有方法签名`)
  }
  for (const p of manifest.protocols || []) {
    if (!p.useCase) problems.push(`协议 ${p.id} 没有 owning use-case`)
    else if (!el.has(p.useCase)) problems.push(`协议 ${p.id} 的 use-case ${p.useCase} 不存在`)
    else useCaseOwners.add(p.useCase)
  }
  const useCases = (manifest.elements || []).filter((e) => e.kind === 'use-case')
  if (useCases.length && useCaseOwners.size === 0)
    problems.push('有 use-case 元素但没有任何协议归属')
  for (const u of useCases)
    if (!useCaseOwners.has(u.id)) problems.push(`use-case ${u.id} 没有归属任何协议`)
  return {
    id: 'D4',
    ok: problems.length === 0,
    detail: problems.slice(0, 4).join('；') || '端口与协议闭合',
  }
}

function d5Sequences(runDir, manifest) {
  const el = ids(manifest.elements)
  const problems = []
  const seqs = manifest.sequences || []
  if (!seqs.length) problems.push('R3 能力必须至少有一张跨边界时序图')
  for (const s of seqs) {
    const p = resolve(runDir, s.file || '')
    if (!s.file || !existsSync(p))
      problems.push(`时序 ${s.id} 文件不存在：${s.file || '(缺 file)'}`)
    for (const part of s.participants || []) {
      if (!el.has(part)) problems.push(`时序 ${s.id} 参与者 ${part} 不在分解清单里`)
    }
    if (!nonEmpty(s.participants)) problems.push(`时序 ${s.id} 没有参与者`)
  }
  return {
    id: 'D5',
    ok: problems.length === 0,
    detail: problems.slice(0, 4).join('；') || `${seqs.length} 张时序图参与者全部存在`,
  }
}

function d6Deps(manifest, rules) {
  const byId = new Map((manifest.elements || []).map((e) => [e.id, e]))
  const order = (rules?.layerOrder || []).map((l) => String(l).toLowerCase())
  const problems = []
  // 环检测（DFS）
  const state = new Map()
  const visit = (id, path) => {
    if (state.get(id) === 'done') return
    if (state.get(id) === 'visiting') {
      problems.push(`依赖有环：${[...path, id].join(' → ')}`)
      return
    }
    state.set(id, 'visiting')
    for (const d of byId.get(id)?.dependsOn || []) visit(d, [...path, id])
    state.set(id, 'done')
  }
  for (const id of byId.keys()) visit(id, [])
  // 层序：只能依赖同层或更低层
  if (order.length) {
    for (const e of manifest.elements || []) {
      if (!e.layer || !order.includes(e.layer)) continue
      for (const d of e.dependsOn || []) {
        const t = byId.get(d)
        if (!t?.layer || !order.includes(t.layer)) continue
        if (order.indexOf(t.layer) > order.indexOf(e.layer)) {
          problems.push(`${e.id}(${e.layer}) 依赖了更高层 ${d}(${t.layer})`)
        }
      }
    }
  }
  return {
    id: 'D6',
    ok: problems.length === 0,
    detail: problems.slice(0, 4).join('；') || '依赖无环且层序正确',
  }
}

function d7TriStates(manifest) {
  const rows = manifest.triStates || []
  if (!rows.length)
    return { id: 'D7', ok: false, detail: 'manifest.triStates 为空——每个数据边界都要有三态' }
  const bad = rows
    .filter((r) => !(r.loading && r.empty && r.error))
    .map((r) => r.boundary || '(无名)')
  return {
    id: 'D7',
    ok: bad.length === 0,
    detail: bad.length
      ? `三态不全：${bad.slice(0, 4).join(', ')}`
      : `${rows.length} 个边界三态齐备`,
  }
}

function d8Patterns(manifest, behaviors, root) {
  const patterns = manifest.patterns || []
  if (!patterns.length)
    return { id: 'D8', ok: false, detail: 'manifest.patterns 为空——没有模式选择记录' }
  const problems = []
  const behaviorIds = new Set(behaviors.map((b) => b.id))
  for (const p of patterns) {
    const s = p.symptom || ''
    const isPath = /^[\w./-]+:\d+/.test(s)
    const isBehavior = behaviorIds.has(s)
    if (!isPath && !isBehavior)
      problems.push(`${p.id} 的症状「${s}」既不是 path:line 也不是行为 ID`)
    if (isPath) {
      const [file] = s.split(':')
      if (!existsSync(resolve(root, file))) problems.push(`${p.id} 的症状指向不存在的文件 ${file}`)
    }
    if (!nonEmpty(p.rejected)) problems.push(`${p.id} 没有记录被否方案`)
    if (!p.costIfWrong) problems.push(`${p.id} 没有错判成本`)
  }
  return {
    id: 'D8',
    ok: problems.length === 0,
    detail: problems.slice(0, 4).join('；') || `${patterns.length} 个模式有据`,
  }
}

function d9Budget(runDir, manifest) {
  const q = manifest.quality || {}
  const problems = []
  for (const k of ['maxFileLines', 'maxComplexity', 'maxProps']) {
    if (typeof q[k] !== 'number' || q[k] <= 0) problems.push(`quality.${k} 必须是正数`)
  }
  for (const f of ['design/components.md', 'design/dynamics.md', 'design/quality.md']) {
    const t = readText(resolve(runDir, f))
    if (t === null) continue
    const hits = BANNED_WORDS.filter((w) => t.includes(w))
    if (hits.length) problems.push(`${f} 出现模糊词：${hits.join('/')}`)
  }
  return {
    id: 'D9',
    ok: problems.length === 0,
    detail: problems.slice(0, 4).join('；') || '预算有数字、无模糊词',
  }
}

function d10MatchesAD(manifest, rules) {
  const mechs = new Set(rules?.mechanisms || [])
  const problems = []
  if (!mechs.size) problems.push('arch/rules.json 没有 mechanisms')
  for (const s of manifest.states || []) {
    if (s.mechanism && !mechs.has(s.mechanism))
      problems.push(`state「${s.key}」的机制 ${s.mechanism} 不在 AD 枚举里`)
  }
  for (const p of manifest.protocols || []) {
    if (!p.contractRef) problems.push(`协议 ${p.id} 没有 contractRef（指向冻结契约条目）`)
  }
  return {
    id: 'D10',
    ok: problems.length === 0,
    detail: problems.slice(0, 4).join('；') || '与 AD 一致',
  }
}

function d11Components(manifest, _root) {
  const comps = manifest.components || []
  if (!comps.length)
    return {
      id: 'D11',
      ok: false,
      detail: 'manifest.components 为空——没有组件树，实施时只能凭记忆拆',
    }
  const els = new Set((manifest.elements || []).map((e) => e.id))
  const ids = comps.map((c) => c.id)
  const dup = ids.filter((x, i) => ids.indexOf(x) !== i)
  const problems = []
  if (dup.length) problems.push(`组件 id 重复：${[...new Set(dup)].join(', ')}`)
  const byId = new Map(comps.map((c) => [c.id, c]))
  const roots = comps.filter((c) => !c.parent)
  if (roots.length !== 1)
    problems.push(
      `组件树必须有且只有一个根，实际 ${roots.length} 个（${roots.map((c) => c.id).join(', ') || '无'}）`,
    )
  for (const c of comps) {
    if (!c.name) problems.push(`${c.id} 缺 name`)
    if (!c.element || !els.has(c.element)) problems.push(`${c.id} 的 element「${c.element}」不存在`)
    if (!/\.[jt]sx?$/.test(c.file || '')) problems.push(`${c.id} 的 file 不是 ts/tsx：${c.file}`)
    if (/^ref_projects\//.test(c.file || ''))
      problems.push(`${c.id} 的 file 指向源仓——落点必须是 evo-pi 路径`)
    if (!Array.isArray(c.props)) problems.push(`${c.id} 缺 props 数组（无 props 也要写 []）`)
    if (!Array.isArray(c.sources) || !c.sources.length)
      problems.push(`${c.id} 没有 sources（组件凭什么存在，得指回源码行）`)
    if (c.parent && !byId.has(c.parent)) problems.push(`${c.id} 的 parent「${c.parent}」不存在`)
  }
  // 环检测：顺着 parent 往上走，超过节点数就是有环
  for (const c of comps) {
    let cur = c
    let hops = 0
    while (cur?.parent) {
      cur = byId.get(cur.parent)
      if (!cur || ++hops > comps.length) {
        problems.push(`${c.id} 的父子关系有环`)
        break
      }
    }
  }
  return {
    id: 'D11',
    ok: problems.length === 0,
    detail: problems.slice(0, 4).join('；') || `${comps.length} 个组件的树闭合（1 根，无环）`,
  }
}

function d12HooksStores(manifest) {
  const hooks = manifest.hooks || []
  const stores = manifest.stores || []
  const problems = []
  if (!hooks.length) problems.push('manifest.hooks 为空——逻辑抽到哪里没交代')
  const compIds = new Set((manifest.components || []).map((c) => c.id))
  const elIds = new Set((manifest.elements || []).map((e) => e.id))
  const stateOwner = new Map((manifest.states || []).map((s) => [s.key, s.owner]))
  for (const h of hooks) {
    if (!h.name) problems.push(`${h.id} 缺 name`)
    if (!h.signature) problems.push(`${h.id} 缺 signature（实施时要照着签名写）`)
    const users = h.usedBy || []
    if (!users.length) problems.push(`${h.id} 没有被任何组件使用（孤儿 hook）`)
    const bad = users.filter((u) => !compIds.has(u))
    if (bad.length) problems.push(`${h.id} 的 usedBy 含未声明的组件：${bad.join(', ')}`)
    if (h.element && !elIds.has(h.element))
      problems.push(`${h.id} 的 element「${h.element}」不存在`)
    if (!h.replaces) problems.push(`${h.id} 没写 replaces（替代了源码的哪段逻辑）`)
  }
  for (const s of stores) {
    const refs = s.stateRefs || []
    if (!refs.length) problems.push(`${s.id} 没有 stateRefs`)
    const unknown = refs.filter((r) => !stateOwner.has(r))
    if (unknown.length) problems.push(`${s.id} 的 stateRefs 含未声明的状态：${unknown.join(', ')}`)
    const foreign = refs.filter((r) => stateOwner.has(r) && stateOwner.get(r) !== s.element)
    if (foreign.length)
      problems.push(`${s.id} 持有不属于自己元素的状态：${foreign.join(', ')}（状态唯一归属）`)
    if (!s.file || !/\.[jt]sx?$/.test(s.file)) problems.push(`${s.id} 的 file 不合法：${s.file}`)
  }
  return {
    id: 'D12',
    ok: problems.length === 0,
    detail:
      problems.slice(0, 4).join('；') ||
      `${hooks.length} 个 hook / ${stores.length} 个 store 闭合（无孤儿、状态归属一致）`,
  }
}

const _DIAGRAM_TIMEOUT = 1000

/** god 文件行数：出处越界的门要先知道文件有多长 */
function countLinesOf(rel, root = '.') {
  const p = resolve(root, rel)
  if (!existsSync(p)) return 0
  return readFileSync(p, 'utf8').split('\n').length
}

/** 从 mermaid 代码块里抽节点 id（只认本设计已声明的 id 形状） */
// 节点 id 必须是本设计已声明的形状：元素 D-*/P-*、组件 C-*、hook H-*、store ST-*、时序 S-*。
// 负向环视是为了不把 `P-S-01` 里的 `S-01` 当节点——首版就吃过这个亏（假引用 + 假缺图）。
const ID_RE = /(?<![\w-])((?:[DP]-[A-Z]+-\d+|C-\d+|H-\d+|ST-\d+|S-\d+))(?![-\w])/g
function mermaidIds(text) {
  const ids = new Set()
  for (const m of text.matchAll(/```mermaid\n([\s\S]*?)```/g)) {
    for (const n of m[1].matchAll(ID_RE)) ids.add(n[1])
  }
  return ids
}

function d13Diagrams(runDir, manifest) {
  const comps = manifest.components || []
  // R1 的小页面往往 1–2 个组件，画图是形式主义；组件数到了才需要图
  if (comps.length < 3)
    return { id: 'D13', ok: true, detail: `只有 ${comps.length} 个组件，不要求画图` }
  // 图不再单独放 design/diagrams/：静态图在 components.md、动态图在 dynamics.md。
  // 早先单独目录的代价是"图与说明分家"，读者要在两个文件之间来回对 id。
  const dir = resolve(runDir, 'design')
  const wanted = ['components.md', 'dynamics.md']
  const files = wanted.filter((f) => existsSync(join(dir, f)))
  const problems = []
  if (!files.length)
    problems.push('design/ 下没有 components.md / dynamics.md——流程/状态没有图，实施时只能猜')
  const declared = new Set([
    ...(manifest.elements || []).map((e) => e.id),
    ...(manifest.components || []).map((c) => c.id),
    ...(manifest.hooks || []).map((h) => h.id),
    ...(manifest.stores || []).map((s) => s.id),
    // 端口是图的主力参与者（P-S-01 这类），不列进来会把正常图判成假引用
    ...(manifest.ports || []).map((p) => p.id),
    ...(manifest.sequences || []).map((s) => s.id),
  ])
  const seen = new Set()
  for (const f of files) {
    const text = readFileSync(join(dir, f), 'utf8')
    // 仍带 init 铺底横幅 = 没填；不能因为里面有示例节点就算画过了
    if (text.slice(0, 400).includes('TODO-init-scaffold')) {
      problems.push(`${f} 仍是 init 铺底模板（顶部横幅未删）`)
      continue
    }
    const ids = mermaidIds(text)
    const unknown = [...ids].filter((i) => !declared.has(i))
    if (unknown.length) problems.push(`${f} 引用了未声明的 id：${unknown.join(', ')}`)
    if (ids.size < 2 && !/sequenceDiagram/.test(text))
      problems.push(`${f} 的 mermaid 图不足 2 个已声明节点`)
    for (const i of ids) seen.add(i)
  }
  const missing = (manifest.components || []).filter((c) => !seen.has(c.id))
  if (missing.length)
    problems.push(
      `${missing.length} 个组件没出现在任何图里：${missing.map((c) => c.id).join(', ')}`,
    )
  return {
    id: 'D13',
    ok: problems.length === 0,
    detail:
      problems.slice(0, 4).join('；') ||
      `${files.length} 张图、${seen.size} 个节点全部落在已声明的 id 上`,
  }
}

/** 解析 `path#L1-L20` 形式的源码出处 */
function parseSourceRef(ref) {
  const m = /^(.+?)#L(\d+)(?:-L?(\d+))?$/.exec(String(ref || '').trim())
  if (!m) return null
  const a = Number(m[2])
  const b = m[3] ? Number(m[3]) : a
  return b >= a ? { file: m[1], a, b } : null
}

const mergePairs = (pairs) => {
  const merged = []
  for (const [a, b] of pairs.sort((x, y) => x[0] - y[0])) {
    const last = merged[merged.length - 1]
    if (last && a <= last[1] + 1) last[1] = Math.max(last[1], b)
    else merged.push([a, b])
  }
  return merged
}

function d14Sources(manifest, ownershipRanges, godLines) {
  const els = manifest.elements || []
  const problems = []
  const owned = new Map()
  for (const r of ownershipRanges || []) {
    // drop 区间的“归属”是解释而不是元素（如“pi-web 常量表”），不进 D14 的对账
    if (r.type === 'drop') continue
    if (!owned.has(r.owner)) owned.set(r.owner, [])
    owned.get(r.owner).push([r.a, r.b])
  }
  for (const e of els) {
    // 元素只写 `lines` 时自动拼成出处：ownership 已经规定了谁占哪段，不必再抄一遍
    const rawSrcs = e.sources?.length
      ? e.sources
      : manifest.god && e.lines
        ? [`${manifest.god}#${e.lines}`]
        : []
    const refs = rawSrcs.map(parseSourceRef)
    const bad = rawSrcs.filter((_s, i) => !refs[i])
    if (bad.length)
      problems.push(`${e.id} 的 sources 格式不对（要 path#L1-L20）：${bad.join(', ')}`)
    if (!refs.filter(Boolean).length) {
      // 新增/派生的元素没有源行——必须说清楚从哪来、为什么存在
      if (!e.rationale) problems.push(`${e.id} 没有源码出处，也没写 rationale`)
      // derivedFrom 允许写一个 id 或数组（模板里两种都见过），不要因为写成字符串就崩栈
      const from = [].concat(e.derivedFrom ?? [])
      if (!from.length) problems.push(`${e.id} 没有源码出处，也没写 derivedFrom`)
      const unknown = from.filter((x) => !els.some((y) => y.id === x && (y.sources || []).length))
      if (unknown.length)
        problems.push(`${e.id} 的 derivedFrom 指向没有出处的元素：${unknown.join(', ')}`)
      continue
    }
    for (const r of refs.filter(Boolean)) {
      if (manifest.god && r.file !== manifest.god)
        problems.push(`${e.id} 的出处不是本 run 的 god（${r.file}）`)
      if (godLines && r.b > godLines)
        problems.push(`${e.id} 的出处超出文件行数（L${r.b} > ${godLines}）`)
    }
    // 出处必须与 ownership 的归属一致：两边说的不是同一段，就必有一边在编
    const mine = mergePairs(refs.filter(Boolean).map((r) => [r.a, r.b]))
    const theirs = mergePairs(owned.get(e.id) || [])
    if (!theirs.length) problems.push(`${e.id} 有出处，但 ownership 没有把任何行区间归给它`)
    else if (JSON.stringify(mine) !== JSON.stringify(theirs))
      problems.push(
        `${e.id} 的 sources ${mine.map(([a, b]) => `L${a}-L${b}`).join(',')} 与 ownership 归属 ${theirs
          .map(([a, b]) => `L${a}-L${b}`)
          .join(',')} 不一致`,
      )
  }
  for (const [owner, pairs] of owned) {
    if (!els.some((e) => e.id === owner))
      problems.push(
        `ownership 把 ${mergePairs(pairs)
          .map(([a, b]) => `L${a}-L${b}`)
          .join(',')} 归给不存在的元素 ${owner}`,
      )
  }
  return {
    id: 'D14',
    ok: problems.length === 0,
    detail:
      problems.slice(0, 4).join('；') ||
      `${els.length} 个元素的出处与 ownership 完全一致${els.filter((e) => !(e.sources || []).length && !e.lines).length ? '（含派生元素 rationale）' : ''}`,
  }
}

/**
 * 设计原则的闭集：只允许"跨项目稳定、人可判定"的通用原则。
 * 架构约束（层序、禁止边、use-cases/adapters 名词）不在其列——那些归 `arch/rules.json`，
 * 由 D6/D10 判。放进这里会让"原则"退化成把别处的门抄一遍（试点 PRI-1..4 就是这样）。
 */
/** 架构约束不该出现在 principles：用关键词挡（判据化，而不是靠提醒） */
/**
 * D17 专业视图：静态用 UML 组件/类图，动态用序列图。
 *
 * 为什么要有这道门：D11/D12/D13 只查"数据结构里写了组件/hook/store、图里节点 id 合法"，
 * 于是交付出去的 `components.md` 可以是一张 ASCII 缩进表 + 一张随便画的流程图——
 * 开发看不出谁是容器谁是展示组件、hook 属于谁、store 被谁订阅，测试也不知道该在哪一层下手。
 * 这条门要的是**能被开发和测试直接读的图**：
 * - `components.md` 必须有 mermaid 类图/流程图，且每个组件标 «container»/«presenter»，每个 hook 标 «hook»，每个 store 标 «store»；
 * - 组件之间至少有一条依赖边（`-->`），store 至少有一条订阅边（`..>` 或 `-.->`）；
 * - `dynamics.md` 至少一张 `sequenceDiagram`，且每个端口都在某张序列图里出现过（接口是被调用的，不是被陈列的）。
 */
function d17Uml(runDir, manifest) {
  const problems = []
  const staticTxt = readText(resolve(runDir, 'design/components.md'))
  const dynTxt = readText(resolve(runDir, 'design/dynamics.md'))
  if (staticTxt === null)
    return {
      id: 'D17',
      ok: false,
      detail: '缺 design/components.md（静态视图：UML 组件图/类图）',
    }
  if (dynTxt === null)
    return { id: 'D17', ok: false, detail: '缺 design/dynamics.md（动态视图：序列图 + 状态流图）' }

  const blocks = [...staticTxt.matchAll(/```mermaid\n([\s\S]*?)```/g)].map((m) => m[1])
  const uml = blocks.filter((b) => /^\s*(classDiagram|flowchart|graph)\b/m.test(b))
  if (!uml.length) problems.push('components.md 没有 mermaid 类图/流程图（表格说明不了依赖关系）')
  const staticBody = uml.join('\n')

  const comps = manifest.components || []
  const hooks = manifest.hooks || []
  const stores = manifest.stores || []
  // 型标注允许三种写法：`class C-01 { <<container>> }`（型在类体里）、
  // `class C01["C-01 SkillsPanel"] { <<container>> }`（图内 id 短、真 id 写在标签里）、
  // `C-01["SkillsPanel «container»"]` / `C-01:::container`（流程图写法）。
  // 之所以要认标签写法：mermaid 的 classDiagram 对连字符 id 支持不稳，图内用 C01、
  // 标签里写真实 id 是标准做法——门如果只认一种，就会逼人写渲染不出来的图。
  const classBlocks = [
    ...staticBody.matchAll(/class\s+([^\s[{]+)\s*(?:\["([^"]*)"\])?\s*\{([^}]*)\}/g),
  ]
  const stereo = (id, want) => {
    const pat = new RegExp(`(?:«|<<)\\s*${want}\\s*(?:»|>>)`)
    if (new RegExp(`${id}:::${want}`).test(staticBody)) return true
    // 流程图/节点写法：id 与 «型» 出现在同一行
    if (new RegExp(`${id}\\b[^\\n]*?(?:«|<<)\\s*${want}\\s*(?:»|>>)`).test(staticBody)) return true
    // 类图写法：在同一个 class 块里，标签或类名带真实 id，且类体标了型
    return classBlocks.some((m) => {
      const header = `${m[1]} ${m[2] || ''}`
      return header.includes(id) && pat.test(m[3])
    })
  }
  const unmarked = comps.filter((c) => !stereo(c.id, 'container') && !stereo(c.id, 'presenter'))
  if (unmarked.length)
    problems.push(
      `${unmarked.length} 个组件没标 «container»/«presenter»：${unmarked.map((c) => c.id).join(', ')}`,
    )
  const missingHook = hooks.filter((h) => !stereo(h.id, 'hook'))
  if (missingHook.length)
    problems.push(
      `${missingHook.length} 个 hook 没标 «hook»：${missingHook.map((h) => h.id).join(', ')}`,
    )
  const missingStore = stores.filter((s) => !stereo(s.id, 'store'))
  if (missingStore.length)
    problems.push(
      `${missingStore.length} 个 store 没标 «store»：${missingStore.map((s) => s.id).join(', ')}`,
    )
  if (!/-->/.test(staticBody)) problems.push('静态图里没有任何组件依赖边（`-->`）')
  if (!/(\.\.>|-\.->)/.test(staticBody))
    problems.push('静态图里没有 store 订阅边（用 `..>` 表示订阅，别用实线箭头混同依赖）')

  const dynBlocks = [...dynTxt.matchAll(/```mermaid\n([\s\S]*?)```/g)].map((m) => m[1])
  const seqs = dynBlocks.filter((b) => /^\s*sequenceDiagram\b/m.test(b))
  if (!seqs.length)
    problems.push('dynamics.md 没有 sequenceDiagram（接口怎么被调用只能靠动态图说清）')
  const seqBody = seqs.join('\n')
  const ports = (manifest.elements || []).filter((e) => e.kind === 'port')
  const unusedPorts = ports.filter((p) => !seqBody.includes(p.id))
  if (unusedPorts.length)
    problems.push(
      `${unusedPorts.length} 个端口没出现在任何序列图里：${unusedPorts.map((p) => p.id).join(', ')}`,
    )
  const stateCharts = dynBlocks.filter((b) => /^\s*stateDiagram(-v2)?\b/m.test(b))
  if (!stateCharts.length)
    problems.push('dynamics.md 没有 stateDiagram（状态流转要图，不要一张归属表）')

  return {
    id: 'D17',
    ok: problems.length === 0,
    detail:
      problems.slice(0, 4).join('；') ||
      `静态视图 ${uml.length} 张（${comps.length} 组件 / ${hooks.length} hook / ${stores.length} store 已标型）、动态视图 ${seqs.length} 张序列图 + ${stateCharts.length} 张状态图`,
  }
}

// 前端最佳实践必须"落地"，不能只写在原则里。每条实践要能指到一个元素，并说清做到什么程度。
// 判据刻意做成闭集 + 机制词：写成"注意渲染性能"这种话，等于没写——实施时没人知道该加 memo 还是该拆组件。
const PRACTICES = [
  ['容器展示分离', /容器|展示|presenter/i, null],
  ['状态就近', /状态|state|就近/i, null],
  ['派生状态不落库', /派生|derive|计算/i, null],
  ['渲染优化', /渲染|render|重渲染/i, /memo|useMemo|useCallback|useSelector|虚拟/i],
  ['列表 key 稳定', /key|列表/i, /key/i],
  ['受控与非受控一致', /受控|非受控|controlled/i, null],
  ['可访问性', /可访问|a11y|无障碍/i, /role|aria|label|键盘|tab/i],
  ['错误边界', /错误边界|error boundary|ErrorBoundary/i, /ErrorBoundary|边界|catch/i],
  ['三态齐备', /三态|加载|loading/i, /空态|错误态|loading/i],
  ['代码分割', /代码分割|懒加载|lazy/i, /lazy|dynamic|import\(/i],
  ['并发竞态', /竞态|race|并发/i, /cancel|abort|generation|ignore|最后一次/i],
  ['缓存与失效', /缓存|cache|失效/i, /invalidate|stale|revalidate|TTL|过期/i],
]

/** D18：`components.md` 的「前端最佳实践」表——每条实践落到哪个元素、做到什么程度 */
function d18Practices(runDir, manifest) {
  const md = readText(resolve(runDir, 'design/components.md'))
  if (md === null)
    return { id: 'D18', ok: false, detail: '缺 design/components.md——最佳实践无处落' }
  const declared = new Set([
    ...(manifest.elements || []).map((e) => e.id),
    ...(manifest.components || []).map((c) => c.id),
    ...(manifest.hooks || []).map((h) => h.id),
    ...(manifest.stores || []).map((s) => s.id),
    ...(manifest.ports || []).map((p) => p.id),
  ])
  const tables = parseTables(md)
  const t = tables.find((x) => {
    const head = x.header.map((h) => h || '').join('|')
    return /实践/.test(head) && /落点|落点|落在|元素/.test(head)
  })
  if (!t)
    return {
      id: 'D18',
      ok: false,
      detail: 'components.md 缺「前端最佳实践」表（列：实践 / 落在哪 / 做到什么程度）',
    }
  const pCol = columnOf(t.header, '实践')
  const whereCol =
    columnOf(t.header, '落在哪') >= 0 ? columnOf(t.header, '落在哪') : columnOf(t.header, '落点')
  const howCol =
    columnOf(t.header, '做到什么程度') >= 0
      ? columnOf(t.header, '做到什么程度')
      : columnOf(t.header, '怎么落地')
  const rows = t.rows.filter((r) => r.some((c) => stripCell(c)))
  const problems = []
  const hit = new Set()
  for (const r of rows) {
    const practice = stripCell(r[pCol])
    const where = stripCell(r[whereCol])
    const how = stripCell(r[howCol])
    const def = PRACTICES.find(([, re]) => re.test(practice))
    if (!def) {
      problems.push(
        `「${practice || '(空)'}」不在最佳实践闭集里（容器展示分离/状态就近/派生状态/渲染优化/列表key/受控一致/可访问性/错误边界/三态/代码分割/并发竞态/缓存与失效）`,
      )
      continue
    }
    hit.add(def[0])
    // 早先用 /[DCPHST]-[A-Z]*-?\d+/ 会把 ST-01 误切成 T-01（S 后面不是 -），导致 store 落点永远判“没指到已声明元素”
    const ids = where.match(/[A-Z]{1,3}-[A-Z0-9]*-?\d+/g) || []
    const known = ids.filter((i) => declared.has(i))
    if (!known.length) problems.push(`「${def[0]}」的落点没指到已声明元素（写 ${where || '(空)'}）`)
    if (how.length < 10) problems.push(`「${def[0]}」没说清做到什么程度（${how.length} 字 < 10）`)
    if (def[2] && !def[2].test(how)) problems.push(`「${def[0]}」要写具体机制（${how || '(空)'}）`)
  }
  if (hit.size < 6)
    problems.push(`实际覆盖 ${hit.size} 类实践，至少要 6 类（少了等于漏掉一整类常识）`)
  return {
    id: 'D18',
    ok: problems.length === 0,
    detail:
      problems.slice(0, 4).join('；') ||
      `${hit.size} 类最佳实践都落到元素上（${[...hit].join('/')}）`,
  }
}

/** 散文抽查：文档里凡写 `path:line` 的，文件必须存在且行号不越界 */
function d16ProseAnchors(runDir, root, programDir) {
  const dirs = ['design', '.']
  const files = []
  for (const d of dirs) {
    const abs = resolve(runDir, d)
    if (!existsSync(abs)) continue
    for (const f of readdirSync(abs)) {
      if (f.endsWith('.md')) files.push(resolve(abs, f))
      if (d === 'design' && f === 'diagrams' && existsSync(resolve(abs, 'diagrams')))
        for (const g of readdirSync(resolve(abs, 'diagrams')))
          if (g.endsWith('.md')) files.push(resolve(abs, 'diagrams', g))
    }
  }
  const problems = []
  let checked = 0
  const lineCount = new Map()
  for (const f of files) {
    const text = readFileSync(f, 'utf8')
    // 只认"看起来是真路径"的锚点；`<run>/x.md` 这类占位不算
    for (const m of text.matchAll(/([\w@./-]+\.(?:tsx?|mjs|js|json|md|css)):(\d+)(?:-(\d+))?/g)) {
      const rel = m[1]
      if (!/\//.test(rel)) continue
      // 能力 run 的散文会引用 program run 里的契约（`contracts/wire.md:80`）。
      // 只按仓库根解析会把它们全判成"不存在"——按 run → program run → 仓库根依次找。
      const candidates = [
        resolve(runDir, rel),
        programDir ? resolve(programDir, rel) : null,
        resolve(root, rel),
      ].filter(Boolean)
      const abs = candidates.find((p) => existsSync(p))
      if (!abs) {
        problems.push(`${rel} 不存在（${f.split('/').pop()} 里引用了它）`)
        continue
      }
      if (!lineCount.has(abs)) {
        const n = readFileSync(abs, 'utf8').split('\n').length
        lineCount.set(abs, n)
      }
      const max = Math.max(Number(m[2]), Number(m[3] || 0))
      if (max > lineCount.get(abs))
        problems.push(`${rel}:${m[2]} 越界（文件只有 ${lineCount.get(abs)} 行）`)
      checked++
    }
  }
  return {
    id: 'D16',
    ok: problems.length === 0,
    detail: problems.slice(0, 4).join('；') || `${checked} 处 path:line 锚点都能落到真实行`,
  }
}

/** 跑设计门；返回 [{id, ok, detail}] */
/**
 * D19 — hook / store 的职责必须写出来（2026-10-23 用户 review 要求）。
 *
 * 为什么单独一道门：C-G 的 `components.md` 有 hook 表、store 表，但只有"签名/被谁用"，
 * 没有"它负责什么、不负责什么"。实施时这条空缺会直接变成"把业务塞进组件"。
 * 判据：`design/components.md` 里 hook 表与 store 表都要有「职责」列，每行 ≥10 字，
 * 且 manifest 声明的每个 hook / store 都在表里出现（不许文档与结构各走一条路）。
 */
function d19Duties(runDir, manifest) {
  const md = readText(join(runDir, 'design/components.md'))
  if (md === null)
    return { id: 'D19', ok: false, detail: 'design/components.md 不存在——先按模板写实施图纸' }
  const problems = []
  const check = (kind, ids) => {
    const t = parseTables(md).find((x) => x.header.some((h) => new RegExp(kind).test(h)))
    if (!t) {
      problems.push(`没有「${kind}」表`)
      return
    }
    const dutyCol = columnOf(t.header, '职责')
    if (dutyCol < 0) {
      problems.push(`「${kind}」表缺「职责」列（它负责什么、不负责什么）`)
      return
    }
    const idCol = columnOf(t.header, 'id') >= 0 ? columnOf(t.header, 'id') : 0
    const rows = t.rows.map((r) => ({
      id: stripCell(r[idCol]).replace(/`/g, ''),
      duty: stripCell(r[dutyCol]),
    }))
    const listed = new Set(rows.map((r) => r.id).filter(Boolean))
    const missing = ids.filter((id) => !listed.has(id))
    if (missing.length) problems.push(`「${kind}」表里少了 ${missing.slice(0, 4).join(', ')}`)
    const thin = rows.filter((r) => r.id && r.duty.length < 10)
    if (thin.length)
      problems.push(`${thin.length} 行「${kind}」职责太短（<10 字）：${thin.slice(0, 3).map((r) => r.id).join(', ')}`)
  }
  check('hook', (manifest.hooks || []).map((h) => h.id))
  check('store', (manifest.stores || []).map((s) => s.id))
  return {
    id: 'D19',
    ok: problems.length === 0,
    detail: problems.join('；') || `${(manifest.hooks || []).length} 个 hook、${(manifest.stores || []).length} 个 store 都写了职责`,
  }
}

export function runDesignGates({
  runDir,
  manifest,
  behaviors,
  surface,
  rules,
  level = 'R3',
  root = '.',
  ownershipRanges = [],
  programDir = null,
}) {
  if (!manifest)
    return [{ id: 'D0', ok: false, detail: 'design/manifest.json 不存在或不是合法 JSON' }]
  const want = GATES_BY_LEVEL[level] || GATES_BY_LEVEL.R3
  const godLines = manifest.god ? countLinesOf(manifest.god, root) : 0
  const all = {
    D1: () => d1Coverage(manifest, behaviors),
    D2: () => d2Surfaces(manifest, surface),
    D3: () => d3States(manifest),
    D4: () => d4Ports(manifest),
    D5: () => d5Sequences(runDir, manifest),
    D6: () => d6Deps(manifest, rules),
    D7: () => d7TriStates(manifest),
    D8: () => d8Patterns(manifest, behaviors, root),
    D9: () => d9Budget(runDir, manifest),
    D10: () => d10MatchesAD(manifest, rules),
    D11: () => d11Components(manifest, root),
    D12: () => d12HooksStores(manifest),
    D13: () => d13Diagrams(runDir, manifest),
    D14: () => d14Sources(manifest, ownershipRanges, godLines),
    D16: () => d16ProseAnchors(runDir, root, programDir),
    D17: () => d17Uml(runDir, manifest),
    D18: () => d18Practices(runDir, manifest),
    D19: () => d19Duties(runDir, manifest),
  }
  return want.map((id) => all[id]())
}

/** 行为 ↔ 脚本双向绑定：零孤儿脚本、零无脚本行为 */
export function runBehaviorBinding(behaviors, registry, opts = {}) {
  const problems = []
  // registry 只有一套形状：`scripts[]`。历史上 `harness` 门读 `flows[]`、本函数读 `scripts[]`，
  // 同一个文件两种写法——真实测试里 harness 绿、绑定红，白跑一轮。两种键都认，但只推荐 scripts。
  const declared = registry?.scripts || registry?.flows || []
  // registry.json 解析失败时 loadJson 返回 null：旧实现会一路走到"引用的脚本不在 registry 里"，
  // 让人以为自己的 id 写错了。真实测试里就是**JSON 里一个未转义引号**造成的。
  if (!Array.isArray(declared) || !declared.length)
    return {
      id: 'BIND',
      ok: false,
      detail: registry
        ? 'harness/registry.json 没有 scripts[]/flows[]（脚本登记表为空）'
        : 'harness/registry.json 不可解析——先修 JSON（常见：字符串里有未转义引号）',
    }
  const declIds = new Set(declared.map((s) => s.id))
  const used = new Set()
  for (const b of behaviors) {
    const ids2 = (b.script || '').split(/[,、\s]+/).filter(Boolean)
    if (!ids2.length) problems.push(`${b.id} 没有 script_id`)
    for (const s of ids2) {
      used.add(s)
      if (!declIds.has(s)) problems.push(`${b.id} 引用的脚本 ${s} 不在 registry 里`)
    }
  }
  const orphans = declared.filter((s) => !used.has(s.id)).map((s) => s.id)
  if (orphans.length)
    problems.push(`${orphans.length} 个孤儿脚本（无行为引用）：${orphans.slice(0, 4).join(', ')}`)

  // 绑定 ≠ 实现：试点里 18 个脚本全标 planned，旧版只查 id，于是"双向绑定"全绿而一条测试都没写。
  const IMPL = new Set(['captured', 'implemented', 'passing'])
  const planned = []
  const implemented = []
  for (const s of declared) {
    const status = String(s.status || '')
    if (IMPL.has(status)) {
      implemented.push(s.id)
      // captured/implemented 必须能落到真实测试文件，否则还是"文件里写着有"
      const file = String(s.file || s.path || '')
      if (!file) problems.push(`${s.id} 标了 ${status} 但没有 file（测试写在哪）`)
      else if (opts.root && !existsSync(resolve(opts.root, file)))
        problems.push(`${s.id} 标了 ${status}，但 ${file} 不存在`)
      continue
    }
    if (status === 'manual') {
      if (!s.reason || String(s.reason).length < 10)
        problems.push(`${s.id} 标了 manual 但没有 reason（≥10 字）`)
      continue
    }
    // 其余（planned/pending/空）都算"还没实现"，不算红，但必须在输出里点名，藏不住
    planned.push(s.id)
  }
  const detail =
    `${behaviors.length} 条行为 × ${declared.length} 个脚本已绑定（结构绿）；` +
    `其中 ${implemented.length} 个已实现、${planned.length} 个未实现` +
    (planned.length ? `（${planned.slice(0, 4).join(', ')}${planned.length > 4 ? '…' : ''}）` : '')
  return {
    id: 'BIND',
    ok: problems.length === 0,
    detail: problems.slice(0, 4).join('；') || detail,
  }
}

/** 质量预算：目标目录内文件行数 / props 数 / @design 标注覆盖 */
export function runQualityBudget({ manifest, root = '.' }) {
  const q = manifest?.quality || {}
  const problems = []
  if (!q.maxFileLines) return [{ id: 'Q0', ok: false, detail: 'quality.maxFileLines 未定义' }]
  const targets = q.targets || []
  if (!targets.length) problems.push('quality.targets 为空（无法度量）')
  let files = 0
  let worst = null
  const walk = (dir) => {
    if (!existsSync(dir)) return
    for (const e of readdirSync(dir)) {
      const p = join(dir, e)
      const st = statSync(p)
      if (st.isDirectory()) {
        if (['node_modules', '.next', 'dist'].includes(e)) continue
        walk(p)
      } else if (/\.(ts|tsx)$/.test(e) && !/\.test\./.test(e)) {
        files++
        const n = readFileSync(p, 'utf8').split('\n').length
        if (n > q.maxFileLines)
          problems.push(`${p.replace(`${resolve(root)}/`, '')} ${n} 行 > ${q.maxFileLines}`)
        if (!worst || n > worst.n) worst = { p, n }
      }
    }
  }
  for (const t of targets) walk(resolve(root, t))
  return [
    {
      id: 'Q1',
      ok: problems.length === 0,
      detail:
        problems.slice(0, 4).join('；') || `${files} 个文件，最大 ${worst ? `${worst.n} 行` : '—'}`,
    },
  ]
}

/** 设计→实现漂移：@design 标注 vs manifest 元素 */
export function runDesignDrift({ manifest, root = '.' }) {
  const q = manifest?.quality || {}
  const targets = q.targets || []
  // 代码里合法的标注 id 不止"元素"：组件/hook/store 也各是一个落点，同一个文件可以同时标两者
  // （`mcp-server-detail.tsx` 既实现 `D-U-06` 也实现 `C-04`）。早先只认 elements，导致所有组件被当"隐性设计"。
  const elem = new Set([
    ...ids(manifest?.elements),
    ...ids(manifest?.components),
    ...ids(manifest?.hooks),
    ...ids(manifest?.stores),
  ])
  const tagged = new Map()
  const walk = (dir) => {
    if (!existsSync(dir)) return
    for (const e of readdirSync(dir)) {
      const p = join(dir, e)
      const st = statSync(p)
      if (st.isDirectory()) {
        if (['node_modules', '.next', 'dist'].includes(e)) continue
        walk(p)
      } else if (/\.(ts|tsx)$/.test(e)) {
        const text = readFileSync(p, 'utf8')
        for (const m of text.matchAll(/@design\s+([A-Z]-[\w-]+)/g)) {
          tagged.set(m[1], (tagged.get(m[1]) || 0) + 1)
        }
      }
    }
  }
  for (const t of targets) walk(resolve(root, t))
  // state / port 类元素不要求代码标注（它们由接口与 store 承载）
  const needTag = (manifest?.elements || []).filter(
    (e) => !['state', 'port'].includes(e.kind) && !e.deferred,
  )
  const missing = needTag.filter((e) => !tagged.has(e.id)).map((e) => e.id)
  const ghost = [...tagged.keys()].filter((id) => !elem.has(id))
  const problems = []
  if (missing.length)
    problems.push(
      `${missing.length} 个设计元素未实现（无 @design）：${missing.slice(0, 4).join(', ')}`,
    )
  if (ghost.length)
    problems.push(
      `${ghost.length} 个隐性设计（代码有标注但设计无元素）：${ghost.slice(0, 4).join(', ')}`,
    )
  return [
    {
      id: 'DRIFT',
      ok: problems.length === 0,
      detail: problems.join('；') || `${needTag.length} 个设计元素全部落地，无隐性设计`,
    },
  ]
}

/** 表面枚举：每个表面点必须有归属 */
