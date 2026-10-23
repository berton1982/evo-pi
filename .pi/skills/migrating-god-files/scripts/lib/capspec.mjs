// 能力规格（spec.md）与 UI 原型（design/ui.md）的判据。
//
// 为什么把这两件事做成门（2026-10-23，C-G 试点暴露）：我的 C3/C4 产物全是"文档齐全"的证明，
// 没有一条判据要求"用户故事 + 源码行区间覆盖 + 交互路径与 pi-web 一致 + 看得见的界面原型"。
// 结果：31 条行为、156 个表面点、18 个 e2e 全绿，而界面上只有一个路由页——pi-web 是弹窗，
// 布局、分组、详情、空态全不一样。**判据不覆盖的东西，一定会在交付里消失。**
//
// 这里只做能机器判的部分：结构、覆盖、一致性、原型是否存在且成形。
// 「这个交互对不对」「这个原型是否合乎产品」必须由人签字——见 checks.mjs 的 humanSignoff。

import { columnOf, parseTables, stripCell } from './tables.mjs'

const NAV = /(dialog|modal|弹窗|抽屉|drawer|panel|面板|route|路由|page|页面)/i

/** `L12-L34` 或 `L12` → { from, to } */
function rangeOf(cell) {
  const s = stripCell(cell).replace(/\s/g, '')
  const m = s.match(/^L?(\d+)\s*[-–~]\s*L?(\d+)$/)
  if (m) return { from: Number(m[1]), to: Number(m[2]) }
  const one = s.match(/^L?(\d+)$/)
  if (one) return { from: Number(one[1]), to: Number(one[1]) }
  return null
}

/**
 * checkCapSpec — 能力规格门。
 *
 * 判据（缺一条即红）：
 * 1. 有 `## 用户故事` 表，≥3 行，每行「角色/触发/期望」都写清楚（≥8 字）；
 * 2. 有 `## 源码覆盖` 表，`文件` + `行区间` 两列：**每个 god 文件都要出现**，
 *    且区间合并后覆盖该文件的 ≥85%（一个能力通常跨多个文件多个区间，单文件单区间是警号）；
 * 3. 有 `## 交互与导航` 段，必须声明机制（dialog/panel/route）并给出 `path:line` 证据；
 * 4. 有 `## 与 pi-web 的布局映射` 表，≥3 行（区域 → 目标），空表等于没映射。
 */
export function checkCapSpec({ md, gods }) {
  const text = md || ''
  const problems = []
  const tables = parseTables(text)

  // 1. 用户故事
  const story = tables.find((t) => /角色|用户故事|角色\/触发/.test(t.header.join(' ')))
  const storyRows = story
    ? story.rows.filter((r) => r.some((c) => stripCell(c)) && stripCell(r[0]))
    : []
  if (!/##\s*用户故事/.test(text)) problems.push('缺 `## 用户故事` 段')
  if (storyRows.length < 3) problems.push(`用户故事只有 ${storyRows.length} 条（至少 3 条才能说清能力边界）`)
  // 首列是编号，不算内容；触发与期望两条必须写成人能读的句子
  const thin = storyRows.filter(
    (r) => r.slice(1).filter((c) => stripCell(c).length >= 8).length < 2,
  )
  if (thin.length) problems.push(`${thin.length} 条用户故事写的太薄（触发/期望 各需 ≥8 字）`)

  // 2. 源码覆盖
  const cov = tables.find((t) => columnOf(t.header, '行区间') >= 0)
  if (!/##\s*源码覆盖/.test(text)) problems.push('缺 `## 源码覆盖` 段')
  if (!cov) problems.push('源码覆盖表缺「行区间」列（无法核对覆盖）')
  let covered = 0
  let totalLines = 0
  if (cov) {
    const fileCol = columnOf(cov.header, '文件')
    const rangeCol = columnOf(cov.header, '行区间')
    const byFile = new Map()
    for (const row of cov.rows) {
      const file = stripCell(row[fileCol]).replace(/^`|`$/g, '')
      const r = rangeOf(row[rangeCol])
      if (!file || !r) continue
      if (!byFile.has(file)) byFile.set(file, [])
      byFile.get(file).push(r)
    }
    for (const g of gods || []) {
      const name = (g.path || '').split('/').pop()
      const key = [...byFile.keys()].find((f) => f.endsWith(name))
      if (!key) {
        problems.push(`god 文件 ${name} 在源码覆盖表里没有出现`)
        continue
      }
      const lines = g.lines ?? 0
      const coveredSet = new Set()
      for (const r of byFile.get(key)) {
        for (let i = Math.max(1, r.from); i <= Math.min(lines || r.to, r.to); i += 1) coveredSet.add(i)
      }
      const pct = lines ? coveredSet.size / lines : 0
      covered += coveredSet.size
      totalLines += lines
      const ranges = byFile.get(key)
      if (ranges.length === 1 && lines > 400)
        problems.push(
          `${name} 只给了一个区间（${lines} 行）——一个能力通常跨多个文件多个区间，单区间对账等于没切分`,
        )
      if (pct < 0.85)
        problems.push(`${name} 只覆盖 ${Math.round(pct * 100)}%（要求 ≥85%，未覆盖 = 没读那段源码）`)
    }
  }

  // 3. 交互与导航
  const navIdx = text.indexOf('## 交互与导航')
  if (navIdx < 0) problems.push('缺 `## 交互与导航` 段（没说清这门能力是弹窗还是路由）')
  else {
    const seg = text.slice(navIdx, text.indexOf('\n## ', navIdx + 3) < 0 ? undefined : text.indexOf('\n## ', navIdx + 3))
    if (!NAV.test(seg)) problems.push('交互与导航段没写机制（dialog/panel/route 选一个）')
    if (!/[\w@./-]+\.(?:tsx?|mjs):\d+/.test(seg))
      problems.push('交互与导航段没有 `path:line` 证据——机制不能靠嘴说')
    // 与 pi-web 不一致要说出来，而不是默默换实现
    // 只要求"沿用"或"为什么可以不一样"二者之一，不再要求紧挨着写
    if (
      /pi-web[^\n]*(弹窗|dialog|modal)/i.test(seg) &&
      !/沿用|同样|也(是|用)|为什么可以不一样|差异说明/.test(seg)
    )
      problems.push('pi-web 用弹窗，本能力似乎改成了别的机制——必须在段里写清「为什么可以不一样」并请用户确认')
  }

  // 3.5 人工决策：这些事机器判断不了，但"有没有问过"可以机器判断
  const DECISIONS = [
    [/交互|导航|弹窗|路由|panel|dialog/i, '交互形态'],
    [/保真|像素|信息量|基线/, '保真度基线'],
    [/不迁|不做清单|裁剪/, '本次不迁范围'],
    [/CHG|变更单/, '契约变更批准权'],
    [/R ?级|分级/, 'R 级判定'],
    [/运行时|包边界|barrel|导出面/, '运行时/包边界'],
    [/依赖|新库/, '新依赖'],
    [/i18n|文案|键/, 'i18n 键策略'],
    [/预算|行数|props/, '预算'],
    [/割接|回滚|窗口/, '割接与回滚'],
    [/检查点|继续\/停|人工门/, '检查点'],
  ]
  const decIdx = text.indexOf('## 人工决策')
  if (decIdx < 0) problems.push('缺 `## 人工决策` 段——机器判不了的取舍必须留下"问过人"的记录')
  else {
    const decTable = tables.find(
      (t) => columnOf(t.header, '决策项') >= 0 && columnOf(t.header, '结论') >= 0,
    )
    const rows = decTable ? decTable.rows.filter((r) => r.some((c) => stripCell(c))) : []
    const seg = text.slice(
      decIdx,
      text.indexOf('\n## ', decIdx + 3) < 0 ? undefined : text.indexOf('\n## ', decIdx + 3),
    )
    const missing = DECISIONS.filter(([re]) => !re.test(seg)).map(([, name]) => name)
    const blank = rows.filter((r) => stripCell(r[columnOf(decTable.header, '结论')] ?? '').length < 2)
    if (rows.length < 6) problems.push(`人工决策只有 ${rows.length} 行（至少 6 项，否则说明没系统想过）`)
    if (blank.length) problems.push(`${blank.length} 行决策没有结论（问了不记等于没问）`)
    if (missing.length)
      problems.push(`以下决策项没有出现：${missing.slice(0, 4).join('、')}${missing.length > 4 ? ' 等' : ''}`)
  }

  // 4. 布局映射
  const map = tables.find(
    (t) => /pi-web/i.test(t.header.join(' ')) && /区域|布局|区块/.test(t.header.join(' ')),
  )
  const mapRows = map ? map.rows.filter((r) => r.some((c) => stripCell(c))) : []
  if (!/##\s*与 pi-web 的布局映射/.test(text)) problems.push('缺 `## 与 pi-web 的布局映射` 段')
  if (mapRows.length < 3) problems.push(`布局映射只有 ${mapRows.length} 行（至少 3 个区域才看得出差距）`)

  return {
    ok: problems.length === 0,
    problems,
    totals: { stories: storyRows.length, covered, godLines: totalLines, regions: mapRows.length },
  }
}

/**
 * checkUiProto — UI 原型门。
 *
 * 判据：
 * 1. 至少 2 个 ASCII 原型块（```text / ```ascii / ```），每块 ≥6 行、≤100 列——
 *    主屏 + 空态/失败态，只有主屏说明"异常路径没人画过"；
 * 2. 每个块里必须出现 ≥2 个区域词（列表/详情/工具栏/状态/空态/表单），且用框线字符画出边界；
 * 3. 有 `## 交互态` 表，≥3 行（态 / 触发 / 表现）：没有它，原型只是一张图，不是规格。
 */
export function checkUiProto({ md }) {
  const text = md || ''
  const problems = []
  const blocks = [...text.matchAll(/```(?:text|ascii|txt)?\n([\s\S]*?)```/g)].map((m) => m[1])
  const drawn = blocks.filter((b) => /[│┌└├─┐┘┤┬┴┼+]/.test(b) && b.split('\n').filter(Boolean).length >= 6)
  if (drawn.length < 2)
    problems.push(`可用的 ASCII 原型只有 ${drawn.length} 块（至少 2 块：主屏 + 空态/失败态）`)
  const wide = drawn.filter((b) => b.split('\n').some((l) => l.length > 100))
  if (wide.length) problems.push(`${wide.length} 块原型超过 100 列（终端/评审里会折行，失去可读性）`)
  const thin = drawn.filter(
    (b) => (b.match(/列表|详情|工具栏|状态|空态|表单|分组/g) || []).length < 2,
  )
  if (thin.length) problems.push(`${thin.length} 块原型没有标出区域（至少 2 个区域词）`)

  const t = parseTables(text).find((x) => /态|状态/.test(x.header.join(' ')) && /触发/.test(x.header.join(' ')))
  const rows = t ? t.rows.filter((r) => r.some((c) => stripCell(c))) : []
  if (!/##\s*交互态/.test(text)) problems.push('缺 `## 交互态` 段（空态/加载/失败/成功各是什么样）')
  if (rows.length < 3) problems.push(`交互态只有 ${rows.length} 行（至少 3 个态）`)

  return { ok: problems.length === 0, problems, totals: { blocks: drawn.length, states: rows.length } }
}
