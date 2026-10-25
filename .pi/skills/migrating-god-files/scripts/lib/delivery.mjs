// 交付轨道：桩优先的前后端独立开发 + 联调 + 验收阶梯。
//
// 为什么单独一个模块：这三件事都是"两个团队/两条线各自推进，最后必须能对上"的
// 契约问题，判据是「契约里的每条命令都有桩、每个桩都被真实现替换过、每一层验收
// 都留下了命令与结果」。它们不属于设计门（design.mjs），也不属于结构对账
// （parity/ownership），所以独立。
//
// 教训来源：pi-web 迁移的历史约定是 FE-slice / BE-slice 各自用桩开发、最后集成，
// 而 v2 技能把这件事压成了 c5.2 的一行任务描述——没有任何判据。桩一旦"形状自编"，
// 联调时才发现字段对不上，比没桩更贵。

import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseWireContract } from './contracts.mjs'
import { columnOf, parseTables, readText, stripCell } from './tables.mjs'

const clean = (v) => stripCell(v).replace(/^`|`$/g, '').trim()

// init 铺底的文件带 TODO 横幅。铺底等于"提醒你写"，不等于"已经写了"：
// 模板里的示例行（L1 层命令 pass / T-03 证据）恰好能满足判据，不拦就会
// 出现"什么都没填，门全绿"。
// 只认注释语法：正文里提到这个 token（比如"横幅已删"）不算铺底
const SCAFFOLD_BANNER = /<!--\s*TODO-init-scaffold|^\s*\/\/\s*TODO-init-scaffold/m
const isScaffold = (t) => SCAFFOLD_BANNER.test(String(t || '').slice(0, 500))

// 路径解析：桩实现通常在仓库里（`apps/web/...`，相对 root），夹具通常在 run 里
// （`fixtures/...`，相对 programDir）。两处都找，避免"文件明明在却被判不存在"。
function pick(bases, p) {
  if (!p) return null
  for (const b of bases) {
    if (!b) continue
    const abs = resolve(b, p)
    if (existsSync(abs)) return abs
  }
  return null
}
const norm = (v) => clean(v).replace(/\s+/g, ' ')
const READY = new Set(['ready', 'done', 'captured'])
const BLOCKED = new Set(['blocked', 'pending'])

/**
 * 桩清单：契约里的每条命令/事件都要有一行，桩文件与夹具必须真实存在。
 *
 * 为什么要求"夹具"而不是只要求"桩"：桩只证明"有回什么"，夹具才证明"回什么东西"。
 * 桩返回 `{}` 也能让前端渲染不崩，但一联调就全错。
 */
export function runStubPlan({ programDir, root }) {
  const wireText = readText(resolve(programDir, 'contracts/wire.md'))
  const stubText = readText(resolve(programDir, 'contracts/stubs.md'))
  if (wireText === null) return { ok: false, detail: '缺 contracts/wire.md——先冻结契约' }
  if (stubText === null)
    return { ok: false, detail: '缺 contracts/stubs.md——桩清单不存在，前后端无法独立开工' }
  if (isScaffold(stubText))
    return { ok: false, detail: 'contracts/stubs.md 仍是 init 铺底模板（顶部 TODO 未删）' }

  const contract = parseWireContract(wireText)
  const wanted = new Set([...contract.commands, ...contract.events])
  if (!wanted.size) return { ok: false, detail: '契约里没有命令/事件——先写 wire.md 的两张表' }

  const table = parseTables(stubText).find((t) => columnOf(t.header, '桩实现') >= 0)
  if (!table)
    return {
      ok: false,
      detail: 'stubs.md 没有「桩实现」列的清单表（列：命令/事件、桩实现、夹具、状态、理由）',
    }

  const col = {
    name: columnOf(table.header, '命令'),
    stub: columnOf(table.header, '桩实现'),
    fixture: columnOf(table.header, '夹具'),
    status: columnOf(table.header, '状态'),
    reason: columnOf(table.header, '理由'),
  }
  const rows = new Map()
  for (const r of table.rows) {
    const name = norm(r[col.name])
    if (!name || /^-+$/.test(name)) continue
    rows.set(name, r)
  }

  const problems = []
  const missing = [...wanted].filter((n) => !rows.has(n))
  if (missing.length)
    problems.push(
      `${missing.length}/${wanted.size} 条契约命令/事件没有桩：${missing.slice(0, 3).join('、')}`,
    )

  let ready = 0
  for (const [name, r] of rows) {
    const status = clean(r[col.status]).toLowerCase()
    const stubPath = clean(r[col.stub])
    const fixture = clean(r[col.fixture])
    if (BLOCKED.has(status)) {
      const reason = clean(r[col.reason])
      if (reason.length < 10)
        problems.push(`「${name}」状态 blocked 但理由不足 10 字——桩延期必须有原因与解除条件`)
      continue
    }
    if (!READY.has(status)) {
      problems.push(`「${name}」状态必须 ready 或 blocked（当前「${status || '空'}」）`)
      continue
    }
    ready += 1
    if (!pick([root, programDir], stubPath))
      problems.push(`「${name}」桩实现不存在：${stubPath || '（空）'}`)
    if (!pick([root, programDir], fixture))
      problems.push(`「${name}」夹具不存在：${fixture || '（空）'}——桩返回什么必须落成文件`)
  }

  return {
    ok: problems.length === 0,
    detail:
      problems.join('；') ||
      `${ready}/${wanted.size} 条契约命令/事件有桩与夹具，其余显式 blocked 且写了理由`,
  }
}

/**
 * 本能力的桩就绪度：表面枚举里的 `api` 点（`METHOD /path`）必须桩就绪。
 *
 * 只查"本能力用到的"，因为桩清单是 program 级共享资产；某个 MCP 能力的桩没做完
 * 不该挡住 skills 能力。
 */
export function runStubCoverage({ programDir, surface, root }) {
  const stubText = readText(resolve(programDir, 'contracts/stubs.md'))
  if (stubText === null) return { ok: false, detail: '缺 contracts/stubs.md——本能力无法证明桩就绪' }
  if (isScaffold(stubText))
    return { ok: false, detail: 'contracts/stubs.md 仍是 init 铺底模板（顶部 TODO 未删）' }
  const used = new Set(
    (surface?.entries || []).filter((e) => e.kind === 'api').map((e) => norm(e.text)),
  )
  if (!used.size) return { ok: true, detail: '本能力没有 HTTP 表面点（无桩需求）' }

  const table = parseTables(stubText).find((t) => columnOf(t.header, '桩实现') >= 0)
  if (!table) return { ok: false, detail: 'stubs.md 没有「桩实现」列的清单表' }
  const col = {
    name: columnOf(table.header, '命令'),
    stub: columnOf(table.header, '桩实现'),
    fixture: columnOf(table.header, '夹具'),
    status: columnOf(table.header, '状态'),
  }
  const rows = new Map()
  for (const r of table.rows) {
    const name = norm(r[col.name])
    if (name) rows.set(name, r)
  }

  const problems = []
  let ready = 0
  for (const name of used) {
    const r = rows.get(name)
    if (!r) {
      problems.push(`「${name}」在契约桩清单里没有条目`)
      continue
    }
    const status = clean(r[col.status]).toLowerCase()
    if (!READY.has(status)) {
      problems.push(`「${name}」桩未就绪（${status || '空'}）——前后端独立开发时这里会卡住`)
      continue
    }
    const stubPath = clean(r[col.stub])
    const fixture = clean(r[col.fixture])
    if (!pick([root, programDir], stubPath)) problems.push(`「${name}」桩实现文件不存在`)
    else if (!pick([root, programDir], fixture)) problems.push(`「${name}」夹具不存在`)
    else ready += 1
  }
  return {
    ok: problems.length === 0,
    detail: problems.join('；') || `本能力 ${ready} 个 HTTP 表面点全部桩就绪（桩 + 夹具齐备）`,
  }
}

/**
 * 联调记录：本能力用到的每个 HTTP 命令都要从桩换成真实现，且留下证据。
 *
 * "换成真实现"是唯一能证明桩没被当交付的地方：桩一直绿、真实现从没跑过，
 * 是"前后端各自完工但系统不通"的标准形态。
 */
export function runIntegration({ capabilityDir, surface, root }) {
  const md = readText(resolve(capabilityDir, 'integration.md'))
  if (md === null) return { ok: false, detail: '缺 integration.md——桩替换与联调过程没有落盘' }
  if (isScaffold(md))
    return { ok: false, detail: 'integration.md 仍是 init 铺底模板（顶部 TODO 未删）' }

  const used = new Set(
    (surface?.entries || []).filter((e) => e.kind === 'api').map((e) => norm(e.text)),
  )
  const table = parseTables(md).find((t) => columnOf(t.header, '真实现') >= 0)
  if (!table)
    return {
      ok: false,
      detail: 'integration.md 没有「真实现」列的替换表（列：命令、桩、真实现、联调证据）',
    }
  const col = {
    name: columnOf(table.header, '命令'),
    stub: columnOf(table.header, '桩'),
    real: columnOf(table.header, '真实现'),
    evidence: columnOf(table.header, '联调证据'),
  }
  const rows = new Map()
  for (const r of table.rows) {
    const name = norm(r[col.name])
    if (name) rows.set(name, r)
  }

  const problems = []
  let real = 0
  for (const name of used) {
    const r = rows.get(name)
    if (!r) {
      problems.push(`「${name}」没有联调记录——桩是否已被真实现替换不可查`)
      continue
    }
    const realPath = clean(r[col.real])
    const evidence = clean(r[col.evidence])
    if (!realPath || /^(桩|stub|—|-|无)$/i.test(realPath)) {
      problems.push(`「${name}」真实现为空——仍是桩，不能算联调完成`)
      continue
    }
    if (!pick([root, capabilityDir], realPath)) {
      problems.push(`「${name}」真实现路径不存在：${realPath}`)
      continue
    }
    if (!/^(T-[A-Za-z0-9-]+|gates\/[\w.-]+|e2e\/[\w./-]+)$/.test(evidence)) {
      problems.push(`「${name}」联调证据必须是测试 ID（T-xx）、gates/*.json 或 e2e 脚本路径`)
      continue
    }
    real += 1
  }
  return {
    ok: problems.length === 0,
    detail: problems.join('；') || `${real} 个 HTTP 命令全部换到真实现，且各自留了联调证据`,
  }
}

/**
 * 验收阶梯：L1 算法规格 → L2 架构契约 → L3 组件/交互 → L4 行为对账 → L5 联调 → L6 人工验收。
 *
 * mode='pre'（C6 行为对账后）：L1–L4 必须 pass，L5 在有 HTTP 表面点时必须 pass；
 * mode='final'（C7 收割前）：追加 L6 必须 pass 且有签字人（agent 不得代签）。
 */
const TIERS = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6']

export function runAcceptance({ capabilityDir, surface, mode = 'pre' }) {
  const md = readText(resolve(capabilityDir, 'acceptance.md'))
  if (md === null)
    return {
      ok: false,
      detail: '缺 acceptance.md——验收阶梯没有落盘（模板见 references/templates/acceptance.md）',
    }
  if (isScaffold(md))
    return { ok: false, detail: 'acceptance.md 仍是 init 铺底模板（顶部 TODO 未删）' }

  const table = parseTables(md).find((t) => columnOf(t.header, '结果') >= 0)
  if (!table)
    return {
      ok: false,
      detail: 'acceptance.md 没有「结果」列的阶梯表（列：层、命令、结果、证据、签字）',
    }
  const col = {
    tier: columnOf(table.header, '层'),
    cmd: columnOf(table.header, '命令'),
    result: columnOf(table.header, '结果'),
    evidence: columnOf(table.header, '证据'),
    by: columnOf(table.header, '签字'),
  }
  const rows = TIERS.map(() => null)
  for (const r of table.rows) {
    const tier = clean(r[col.tier])
      .toUpperCase()
      .replace(/[^L0-9]/g, '')
    const idx = TIERS.indexOf(tier)
    if (idx >= 0) rows[idx] = r
  }

  const hasApi = (surface?.entries || []).some((e) => e.kind === 'api')
  const need = mode === 'final' ? TIERS : hasApi ? TIERS.slice(0, 5) : TIERS.slice(0, 4)
  const problems = []
  let passed = 0
  for (const tier of need) {
    const r = rows[TIERS.indexOf(tier)]
    if (!r) {
      problems.push(`${tier} 层缺失（${mode === 'final' ? '收割前六层齐全' : '至少 L1–L4'}）`)
      continue
    }
    const cmd = clean(r[col.cmd])
    const result = clean(r[col.result]).toLowerCase()
    const evidence = clean(r[col.evidence])
    if (!cmd) problems.push(`${tier} 层没有命令——没有命令的验收不算验收`)
    if (result === 'pass') {
      if (!/^(T-[A-Za-z0-9-]+|gates\/[\w.-]+|e2e\/[\w./-]+|manual:[\w-]+)$/.test(evidence))
        problems.push(`${tier} 层结果 pass 但证据不是测试 ID / gates / e2e / manual:<slug>`)
      else passed += 1
    } else if (result === 'skipped') {
      if (clean(r[col.evidence]).length < 10)
        problems.push(`${tier} 层 skipped 但没写豁免理由（为什么这一层不需要）`)
      else passed += 1
    } else if (result === 'pending' && tier === 'L6' && mode !== 'final') {
      passed += 1
    } else {
      problems.push(
        `${tier} 层结果为「${result || '空'}」——必须 pass / skipped(理由) / 收割前 L6 可 pending`,
      )
    }
  }

  if (mode === 'final') {
    const l6 = rows[TIERS.indexOf('L6')]
    const by = l6 ? clean(l6[col.by]) : ''
    if (!/^[\p{L}][\p{L}\p{N}_-]{1,20}$/u.test(by))
      problems.push('L6 人工验验收缺签字人——这一层不可由 agent 代签')
    else if (/agent|assistant|bot|claude|gpt/i.test(by))
      problems.push('L6 由 agent 代签——人工验收必须是人')
  }

  return {
    ok: problems.length === 0,
    detail:
      problems.join('；') ||
      `${passed} 层验收达标（${need.join('/')}）${mode === 'final' ? '，L6 已由人签' : ''}`,
  }
}

export function requiredTiers({ surface, mode }) {
  const hasApi = (surface?.entries || []).some((e) => e.kind === 'api')
  // L5 是"桩被真实现替换"的验收；没有 HTTP 表面点时它对本能力无意义，
  // 强行要求只会逼人写一行 skipped——所以按表面点决定要不要。
  const base = hasApi ? TIERS : TIERS.filter((t) => t !== 'L5')
  return mode === 'final' ? base : base.filter((t) => t !== 'L6')
}
