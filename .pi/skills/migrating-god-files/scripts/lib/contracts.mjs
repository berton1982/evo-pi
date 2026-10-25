// 契约覆盖：**源码里有的命令/事件，契约里必须有**。
//
// 为什么不用上一代的 extract-contract：它靠"从源码抽"来生成契约，
// 生成与校验是同一条逻辑，错了会一起错。
// 这里反过来：分母来自 C1 的**表面枚举**（独立的一次源码扫描），
// 契约只是被核对的一方——两个独立视角，才能互相证伪。
//
// 另外核 DTO 字段 ↔ zod schema：wire 契约里列的字段，schema 必须能解析。

import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { columnOf, parseTables, readText, stripCell } from './tables.mjs'

const norm = (s) => stripCell(s).replace(/`/g, '').trim()

/** 从 wire.md 收集命令名与事件名 */
export function parseWireContract(md) {
  const commands = new Set()
  const events = new Set()
  for (const t of parseTables(md || '')) {
    const first = t.header[0] || ''
    const target = /命令|command/i.test(first)
      ? commands
      : /事件|event/i.test(first)
        ? events
        : null
    if (!target) continue
    for (const row of t.rows) {
      const name = norm(row[0])
      if (name && !/^-+$/.test(name)) target.add(name)
    }
  }
  return { commands, events }
}

/** 表面枚举里的命令/事件点
 *
 * `api` 点是 `METHOD /path` 形状（由 enumerate-surface 归一化），与 wire 契约的
 * 「命令」列同形，所以直接并进 commands 一起对账。
 * 这一条是补过的：早先只收 `case 'x':` 与 `emit('x')`，纯 fetch 的组件在 C2 会
 * 报「无可对账项」而全绿——真实漏登记（`PATCH /api/skills`）全靠人眼发现。
 */
export function surfaceCommands(surface) {
  const commands = new Set()
  const events = new Set()
  for (const e of surface?.entries || []) {
    if (e.kind === 'command' || e.kind === 'api') commands.add(e.text)
    if (e.kind === 'event') events.add(e.text)
  }
  return { commands, events }
}

export function checkContractInventory({ surface, wireText }) {
  const fromSource = surfaceCommands(surface)
  const contract = parseWireContract(wireText)
  const problems = []
  const missingCmd = [...fromSource.commands].filter((c) => !contract.commands.has(c))
  const missingEvt = [...fromSource.events].filter((e) => !contract.events.has(e))
  if (missingCmd.length)
    problems.push(
      `源码有但契约缺 ${missingCmd.length} 个命令：${missingCmd.slice(0, 5).join(', ')}`,
    )
  if (missingEvt.length)
    problems.push(
      `源码有但契约缺 ${missingEvt.length} 个事件：${missingEvt.slice(0, 5).join(', ')}`,
    )
  const totals = {
    sourceCommands: fromSource.commands.size,
    sourceEvents: fromSource.events.size,
    contractCommands: contract.commands.size,
    contractEvents: contract.events.size,
  }
  // 纯 UI 能力可能确实没有命令/事件表面点；此时无可对账项，不算失败。
  // 契约本身的非空性由 P1 的 wireTable 保证。
  const nothingToCheck = !fromSource.commands.size && !fromSource.events.size
  return {
    ok: problems.length === 0,
    totals: { ...totals, nothingToCheck },
    problems,
  }
}

/** DTO 字段 ↔ zod schema 键 */
export function checkSchema(contractDir) {
  const dto = readText(resolve(contractDir, 'data-format.md'))
  const schemaPath = resolve(contractDir, 'schema.ts')
  if (dto === null) return { ok: false, problems: ['缺 data-format.md'], totals: {} }
  if (!existsSync(schemaPath))
    return { ok: false, problems: ['缺 schema.ts（zod 契约）'], totals: {} }
  const schema = readText(schemaPath)
  // 键可能在多行对象里（2 空格缩进），也可能写在 `z.object({ a: z.string(), b: … })` 单行里
  // —— 只认多行会让 discriminatedUnion 的 inline 分支整段漏检（实测 17 条假缺口）。
  const keys = new Set([
    ...[...schema.matchAll(/^\s{2,}(\w+)\s*:/gm)].map((m) => m[1]),
    ...[...schema.matchAll(/(\w+)\s*:\s*z\./g)].map((m) => m[1]),
  ])
  const fields = new Set()
  for (const t of parseTables(dto)) {
    const fCol = columnOf(t.header, '字段')
    if (fCol < 0) continue
    for (const row of t.rows) {
      // 一行写多个字段是正常的（同一行类型的字段表）：`type、version、cwd`
      // 不拆开的话，整串会被当成一个不存在的字段（实测 12 条假缺口）。
      const cell = norm(row[fCol]).replace(/（.*?）/g, '')
      // 形状写法 `{type:'text', text}` 是内容块，不是单个字段名：先取出内部键，
      // 再从剩下的文本里拆字段。整串当键会永远对不上（实测 3 条假缺口）。
      for (const shape of cell.matchAll(/\{([^}]*)\}/g))
        for (const k of shape[1].matchAll(/(\w+)\s*:/g)) fields.add(k[1])
      const rest = cell.replace(/\{[^}]*\}/g, '')
      for (const part of rest.split(/[、,，/|]/)) {
        const f = part.trim().replace(/\?$/, '')
        if (f) fields.add(f)
      }
    }
  }
  const missing = [...fields].filter((f) => !keys.has(f))
  return {
    ok: missing.length === 0 && fields.size > 0,
    totals: { fields: fields.size, schemaKeys: keys.size },
    problems: missing.length
      ? [`${missing.length} 个契约字段在 schema.ts 里没有：${missing.slice(0, 6).join(', ')}`]
      : fields.size
        ? []
        : ['data-format.md 里没有解析到字段表'],
  }
}

/** C2 对齐表：**每行必须指向契约的具体位置**，差异必须收敛成变更单。
 *
 * 为什么单独一道门：`contractDelta` 只验「有 delta 时每行有变更单号」，
 * 而「对齐表本身是不是空壳」没人管——R1 的 C2 曾因此只要一个标题就能过。
 */
export function checkContractAlign(md) {
  const problems = []
  if (!md) return { ok: false, problems: ['文件不存在'], totals: { rows: 0 } }
  const tables = parseTables(md)
  const locName = ['契约位置', '契约']
  const t = tables.find((x) => locName.some((n) => columnOf(x.header, n) >= 0))
  if (!t) {
    return {
      ok: false,
      problems: ['没有「契约位置」列的表格——对齐结果不可核对'],
      totals: { rows: 0 },
    }
  }
  const locCol = locName.map((n) => columnOf(t.header, n)).find((i) => i >= 0)
  const rows = t.rows.filter((r) => (r || []).some((c) => stripCell(c)))
  if (rows.length < 2) problems.push(`对齐表只有 ${rows.length} 行（至少 2 行，否则等于没对齐）`)
  const weak = rows.filter((r) => {
    const v = norm(r[locCol] || '')
    // 已知差异可以没有契约指向，但必须挂编号（D-xx 差异 / CHG-xx 变更单），
    // 否则这一行就是「知道不对但没人管」——那正是要堵的。
    if (/D-\d+|CHG-\d+/.test(r.map((c) => stripCell(c)).join(' '))) return false
    if (!v) return true
    if (/^(无|none|—|-|n\/a|待定|\?)$/i.test(v)) return true
    return !/(\.md|§|CHG-|contracts\/)/.test(v)
  })
  if (weak.length)
    problems.push(
      `${weak.length}/${rows.length} 行既无契约指向也无 D-xx/CHG-xx 编号（要么指向契约文件，要么挂差异编号）`,
    )
  // 「本能力不改契约」是合法结论，但必须明说。不明说就默认有差异要收敛——
  // 否则一份通篇写"已核对"的对齐表可以悄悄掩盖缺口（试点 C-H 就是这么过的）。
  const declaredNone = /(无需|不需要|没有)\s*(任何)?\s*变更单|无差异|不改契约/.test(md)
  const hasDelta = /❌|⚠️|缺登记|差异/.test(md)
  const hasChg = /CHG-\d+/.test(md)
  if (hasDelta && !hasChg && !declaredNone)
    problems.push('标了差异却没有 CHG- 变更单号——差异必须收敛成变更单，否则等于偷偷改契约')
  return {
    ok: problems.length === 0,
    problems,
    totals: { rows: rows.length, chg: hasChg },
  }
}
