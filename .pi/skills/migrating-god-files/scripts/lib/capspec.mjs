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

const NAV_ALLOW_NONE = /none|无界面|不产出界面|不涉及界面/i
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
    // 基础设施能力（C-A 这类）确实没有界面：允许写 none，但仍必须给证据，
    // 否则"没有界面"就成了又一处无法核对的嘴说。
    if (!NAV.test(seg) && !NAV_ALLOW_NONE.test(seg))
      problems.push('交互与导航段没写机制（dialog/panel/route，或 none + 理由）')
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
    (t) => /pi-web/i.test(t.header.join(' ')) && /区域|布局|区块|位置|目标|去向/.test(t.header.join(' ')),
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
  // 基础设施能力没有界面：允许「## 不适用」+ 理由 ≥40 字 + 一处 path:line 证据。
  // 不许留空——空白表格无法区分"没有界面"和"忘了画"。
  if (/##\s*不适用/.test(text)) {
    const seg = text.slice(text.indexOf('## 不适用'))
    const body = seg.split('\n').slice(1).join(' ').replace(/\s+/g, ' ')
    if (body.length < 40) problems.push('「## 不适用」的理由太短（<40 字）')
    if (!/[\w./-]+\.(ts|tsx|mjs):\d+/.test(body))
      problems.push('「## 不适用」没给证据（`path:line`）')
    return { ok: problems.length === 0, problems, totals: { mode: 'not-applicable' } }
  }
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

/**
 * checkRenderBoundary — C0「渲染边界」门。
 *
 * 为什么需要它：`ownership.md` / `readlog.md` 是**行级**模型，`manifest` 是**代码结构**模型，
 * 而用户看到的是**区域**。C-C 试点就是在这里翻车——原型里画了区顶栏与输入区工具条，
 * 而这两个区域的文件（`AppShell.tsx`、`ChatInput.tsx`）属于 C-B / C-D，本能力从未读过。
 *
 * 判据：
 * 1. `CHARTER.md` 必须有 `## 渲染边界`，且是一张「区域 / 宿主 / 说明」表；
 * 2. 至少 1 行宿主是 `self`（否则这个能力什么都不渲染，应该写成 infrastructure）；
 * 3. 宿主取值只能是 `self` / `shell` / `other:<能力 id>`；
 * 4. 没有界面（uiProto 写「## 不适用」）时允许只有一行 `none`，但必须写理由 ≥20 字。
 */
export function checkRenderBoundary({ charter }) {
  const text = charter || ''
  const problems = []
  if (!/##\s*(?:\d+\.\s*)?渲染边界/.test(text)) {
    problems.push('CHARTER 缺 `## 渲染边界`——不写清"这一屏上还有谁"，原型必然越界画别人的区域')
    return { ok: false, problems, totals: { regions: 0 } }
  }
  // 标题可能带编号（`## 4. 渲染边界`），所以用正则定位起点而不是 indexOf 字面量
  const m = text.match(/##\s*(?:\d+\.\s*)?渲染边界[\s\S]*/)
  const seg = m ? m[0] : ''
  const t = parseTables(seg).find((x) => /区域/.test(x.header.join(' ')) && /宿主/.test(x.header.join(' ')))
  if (!t) {
    problems.push('「## 渲染边界」里没有「区域 / 宿主 / 说明」表')
    return { ok: false, problems, totals: { regions: 0 } }
  }
  const rows = t.rows.filter((r) => r.some((c) => stripCell(c)))
  if (!rows.length) problems.push('「## 渲染边界」表是空的（空表格无法区分"没有区域"和"忘了写"）')
  const hosts = rows.map((r) => stripCell(r[1]))
  const bad = hosts.filter((h) => !/^(self|shell|other:[A-Za-z-]+|none)$/.test(h))
  if (bad.length) problems.push(`${bad.length} 行宿主不合法（只能是 self / shell / other:<能力> / none）：${bad.slice(0, 3).join(', ')}`)
  if (!hosts.includes('self') && !hosts.includes('none'))
    problems.push('没有一行宿主是 `self`——本能力不渲染任何区域的话应写成 infrastructure')
  if (hosts.includes('none')) {
    const body = seg.replace(/\s+/g, ' ')
    if (body.length < 60) problems.push('宿主是 none 时要写清为什么没有界面（≥20 字理由）')
  }
  return { ok: problems.length === 0, problems, totals: { regions: rows.length, hosts } }
}

/**
 * checkEntryInventory — `uiProto` 的补充：入口清单双向对账。
 *
 * 上一版 uiProto 只验"有 ASCII + 区域词"，于是"少画 6 个顶栏按钮"照样绿。
 * 这里要求 `design/components.md` 有「区域 → 入口清单」表，并与原型双向一致：
 * 表里有、原型里没有 → 少画；原型里有、表里没有 → 多画（多半是没查证就画上去的）。
 */
export function checkEntryInventory({ components, ui }) {
  const problems = []
  const comp = components || ''
  const proto = ui || ''
  // 基础设施能力不渲染界面：components.md 允许写「## 不适用」+ 理由 + 证据，与 ui.md 同口径。
  // 没有这条分支时，C-A（7,669 行的运行时）会被要求列出"区域 → 入口"，只能编。
  if (/##\s*不适用/.test(comp)) {
    const body = comp.slice(comp.indexOf('## 不适用')).split('\n').slice(1).join(' ').replace(/\s+/g, ' ')
    if (body.length < 40) problems.push('components.md「## 不适用」的理由太短（<40 字）')
    if (!/[\w./-]+\.(ts|tsx|mjs):\d+/.test(body))
      problems.push('components.md「## 不适用」没给证据（`path:line`）')
    return { ok: problems.length === 0, problems, totals: { entries: 0, mode: 'not-applicable' } }
  }
  const t = parseTables(comp).find(
    (x) => /区域/.test(x.header.join(' ')) && /入口/.test(x.header.join(' ')),
  )
  if (!t) {
    problems.push('components.md 缺「区域 / 入口 / 源」表——没有入口清单，原型画多画少都没人知道')
    return { ok: false, problems, totals: { entries: 0 } }
  }
  const rows = t.rows
    .filter((r) => r.some((c) => stripCell(c)))
    .map((r) => ({ region: stripCell(r[0]), name: stripCell(r[1]), src: stripCell(r[2] || '') }))
    .filter((r) => r.name)
  if (!rows.length) problems.push('入口清单表是空的')
  const noSrc = rows.filter((r) => !/[\w./-]+\.(ts|tsx):\d+/.test(r.src))
  if (noSrc.length)
    problems.push(`${noSrc.length} 个入口没有源证据（path:line）：${noSrc.slice(0, 3).map((r) => r.name).join(', ')}`)
  const text = proto.replace(/\s+/g, ' ')
  const missing = rows.filter((r) => !text.includes(r.name))
  if (missing.length)
    problems.push(`${missing.length} 个入口在 components.md 里有、原型里没画：${missing.slice(0, 4).map((r) => r.name).join(', ')}`)
  // 反向：原型方括号里的按钮/入口名（[信任项目] 这种）必须能在清单里找到
  const drawn = [...proto.matchAll(/\[([^\]\n]{1,20})\]/g)]
    .map((m) => m[1].trim())
    .filter((n) => n && !/^[\s]*$/.test(n) && !/^[▾▼▲📎]+$/.test(n) && n.length > 1)
  const known = new Set(rows.map((r) => r.name))
  const extra = [...new Set(drawn)].filter((n) => !known.has(n) && !known.has(n.replace(/^[:：]/, '')))
  if (extra.length)
    problems.push(`${extra.length} 个原型里的入口不在清单里（多画或没查证）：${extra.slice(0, 4).join(', ')}`)
  return {
    ok: problems.length === 0,
    problems,
    totals: { entries: rows.length, drawn: drawn.length },
  }
}

/**
 * checkReadlogCoverage — "你引用了谁的界面，就得读过谁"。
 *
 * 取 `spec.md` 的布局映射表与 `design/ui.md` 里出现的所有源文件路径，
 * 要求 `readlog.md` 里都有阅读记录。C-C 试点漏的正是这条：
 * 原型引用了 AppShell.tsx / ChatInput.tsx，readlog 里 0 条。
 */
export function checkReadlogCoverage({ readlog, docs, gods = [] }) {
  const log = readlog || ''
  const problems = []
  const files = new Set()
  for (const text of docs || []) {
    for (const m of String(text || '').matchAll(/([\w./-]+\.(?:tsx?|mjs))(?::\d+)?/g)) {
      const path = m[1]
      // 只对"上游源码"要求阅读记录：`packages/**` 是我们自己要落的盘，
      // 引用它不需要"读过"（它可能还没存在）。带目录的必须指到 ref_projects/。
      if (path.includes('/') && !path.includes('ref_projects/')) continue
      const f = path.split('/').pop()
      if (!f || /^(index|types)\.ts$/.test(f)) continue
      // 不带目录的名字只在本能力的 god 文件里强制（别处出现多半是散文提及）
      const bare = !path.includes('/')
      const isGod = gods.some((g) => String(g.path || '').split('/').pop() === f)
      if (bare && !isGod) continue
      files.add(f)
    }
  }
  if (!files.size) return { ok: true, problems: [], totals: { files: 0, missing: 0 } }
  const missing = [...files].filter((f) => !log.includes(f))
  if (missing.length)
    problems.push(
      `${missing.length} 个被引用的源文件没有阅读记录：${missing.slice(0, 5).join(', ')}——原型里画它的界面，就得先读过它`,
    )
  return {
    ok: problems.length === 0,
    problems,
    totals: { files: files.size, missing: missing.length },
  }
}
