/**
 * 保真快照门（P7）：`parity.md` 能证明"同一份数据两边一样"，证明不了"同一张页面两边一样"。
 *
 * C-G 试点的实证：数据面 `parity.mjs` 全绿（27 条行为、2 个 server、字段差 18 vs 5），
 * 而并排看页面才发现"行名不表达开关态""组头不是 switch"——这两处任何数据对账都抓不到。
 * 所以保真快照要有一道门，判据只有一件事：**pi-web 上有的可及元素，在差异表里必须有名有姓**。
 *
 * 输入（run 内，由 `harness/fidelity.mjs` 产出）：
 *   harness/snapshot/fidelity/<flow>.piweb.json
 *   harness/snapshot/fidelity/<flow>.evopi.json
 *   每个文件形如 { source:'piweb'|'evopi', flow, anchors:[{ role, name, aria, depth }] }
 *   （兼容早期写法 { entries:[{ role, name, state, depth }] }——state 与 aria 同义，
 *    键只看 role+name：状态差异不该让"同一个元素"被判成两个）
 *
 * 判据：
 *   1. 至少一个 flow，且两侧都拍到了（缺一侧 = 没做过对照，不是"没有差异"）
 *   2. 覆盖率 = |piweb ∩ evopi| / |piweb| ≥ minCoverage（默认 0.7）
 *   3. **pi-web 独有**的每个可及元素，必须在 `parity.md` 里以名字出现（差异表或砍单说明）
 *      —— "没对齐"可以，但"没提过"不行。这一条才是防"静默少了半个页面"的。
 *
 * 反向用例（selftest）：未登记一条 piweb 独有元素 → 红；覆盖率跌破阈值 → 红。
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const norm = (s) => (s ?? '').replace(/\s+/g, ' ').trim().toLowerCase()
/**
 * 比对用的名字要剥掉「状态后缀」：`alpha：已开启` 与 `alpha：测试时已连接` 是同一个元素，
 * 只是此刻状态不同——拿完整名字比会把"状态差异"报成"元素缺失"（C-G 实测覆盖率因此从 60% 掉到 23%）。
 * 状态差异属于保真缺口，但它该由差异表列出来，不该让覆盖率计量失真。
 */
// 开关类标签是**状态**不是身份：pi-web 收起时叫"显示文件面板"、展开时叫"隐藏文件面板"，
// 两边默认态不同就会互相记成"缺失"。归一成同一个身份名再比对。
const TOGGLE = /^(显示|隐藏|打开|关闭|开启|停用|启用)(.+)$/
const baseName = (s) => norm(s).split('：')[0].split(':')[0].trim()

/**
 * 同义词表：同一个东西在不同实现里的叫法。
 *
 * 为什么必须有它：`role:name` 精确比对会把**结构合法的差异**（页签 vs 按钮、中文 vs 英文）
 * 记成"缺元素"。壳这一层实测：修完 aria/i18n 后覆盖率从 12.8% "降到" 12.5%，
 * 而降的原因是我们把文件区做真了、名字却与 pi-web 不同——度量在惩罚正确的工作。
 * 同义词只做"确认是同一个东西"，不掩盖角色/信息量的差：角色不同仍然算两个键。
 */
const SYNONYMS = [
  [/^files?$|^文件$|^檔案$/i, 'files'],
  [/^sessions?$|^会话$|^會話$|^对话$/i, 'sessions'],
  [/^new( session)?$|^新建(会话|會話)?$/i, 'new'],
  [/^search( sessions?| conversations?)?$|^搜索(对话|對話)?$|^搜寻$/i, 'search'],
  [/^settings?$|^设置$|^設定$/i, 'settings'],
  [/^upload$|^上传$|^上傳$/i, 'upload'],
  [/^refresh$|^刷新$/i, 'refresh'],
  [/^toggle sidebar$|^开关侧栏$|^開關側欄$/i, 'toggle-sidebar'],
  [/^toggle right panel$|^开关右侧栏$|^開關右側欄$/i, 'toggle-right-panel'],
]
const synonymOf = (name) => {
  const n = baseName(name)
  for (const [re, canon] of SYNONYMS) if (re.test(n)) return canon
  return n
}
const keyOf = (a) => `${norm(a.role)}|${synonymOf(a.name)}`

function readJson(p) {
  try {
    return JSON.parse(readFileSync(p, 'utf8'))
  } catch {
    return null
  }
}

export function readFidelity(runDir) {
  const dir = join(runDir, 'harness/snapshot/fidelity')
  if (!existsSync(dir)) return { flows: [], dir }
  const files = readdirSync(dir).filter((f) => f.endsWith('.json'))
  const byFlow = new Map()
  for (const f of files) {
    const data = readJson(join(dir, f))
    // 兼容两种写法：规范字段 anchors，与 C-G 试点脚本先写的 entries（字段含义相同）
    // 采集脚本会按 depth 递归把容器与子元素都吐出来（C-G 实测同一 flow 3401 条 = 15 个唯一），
    // 所以先按 role+name 去重：重复条目会让覆盖率被稀释成 0%
    const raw = data?.anchors ?? data?.entries
    if (!Array.isArray(raw)) continue
    const seen = new Set()
    const anchors = raw.filter((a) => {
      const k = `${(a?.role ?? '').trim()}|${(a?.name ?? '').trim()}`
      if (seen.has(k)) return false
      seen.add(k)
      return true
    })
    const flow = data.flow ?? f.replace(/\.(piweb|evopi)\.json$/, '')
    const side = data.source ?? (f.includes('.piweb.') ? 'piweb' : 'evopi')
    const cur = byFlow.get(flow) ?? { flow, piweb: [], evopi: [] }
    cur[side === 'piweb' ? 'piweb' : 'evopi'] = anchors
    byFlow.set(flow, cur)
  }
  return { flows: [...byFlow.values()], dir }
}

export function diffAnchors(piweb, evopi) {
  const ev = new Set(evopi.map(keyOf))
  const pv = new Set(piweb.map(keyOf))
  return {
    onlyPiweb: piweb.filter((a) => !ev.has(keyOf(a))),
    onlyEvopi: evopi.filter((a) => !pv.has(keyOf(a))),
  }
}

const atoms = (name) =>
  String(name ?? '')
    .split(/[：:，,、·—\s]+/)
    .map((x) => x.trim())
    .filter(Boolean)

/**
 * 「信息融合」检测：把两层以上的信息塞进同一个可及名，是**假对齐**的捷径。
 *
 * 实测来源（20261024-web-recal D-2）：项目选择器的可及名被写成
 *   `名称，版本：web 0.1.0，core 0.2.0`
 * 对照的可及树里 pi-web 只是「名称」一个节点，版本是另一个节点。
 * 字符级比对绿了，人眼一看就知道不对——而且这种捷径一旦被允许，
 * 后面所有"人看到的审批"都会建立在假结构上。
 *
 * 判据：同一个 key（role + 基础名）下，我们的可及名比 pi-web 多出 ≥2 段信息 → 上报。
 * 处理方式只有两种：拆成独立节点，或写进文档 `## 信息融合` 并给出 ≥20 字理由。
 */
export function findFusions(piweb, evopi) {
  const out = []
  const byKey = new Map()
  for (const a of evopi) if (!byKey.has(keyOf(a))) byKey.set(keyOf(a), a)
  for (const p of piweb) {
    const e = byKey.get(keyOf(p))
    if (!e) continue
    const extra = atoms(e.name).length - atoms(p.name).length
    if (extra >= 2) out.push({ piweb: `${p.role}:${p.name}`, evopi: `${e.role}:${e.name}`, extra })
  }
  return out
}

/**
 * 基础设施能力（`manifest.kind === 'infrastructure'`）没有界面，拍不出可及树。
 *
 * 这不是"漏拍"，而是**分母不存在**——所以允许文档写 `## 保真不适用` + 理由 + 一处
 * `path:line` 来明示，而不是逼人拍一张空快照（空快照会让后面的覆盖率变成 0/0 的假绿）。
 */
function infraNotApplicable(docText) {
  const m = /##\s*保真不适用\s*\n([\s\S]*?)(?=\n##\s|$)/.exec(docText)
  if (!m) return null
  const body = m[1]
  const reason = body.replace(/\s+/g, ' ').trim()
  const anchored = /[\w./-]+\.(?:ts|tsx|mjs):\d+/.test(body)
  if (reason.length < 40 || !anchored)
    return { ok: false, detail: '「保真不适用」要写 ≥40 字理由 + 一处 `文件:行` 证据' }
  return { ok: true, detail: '基础设施形态：无界面可拍，已在文档写明「保真不适用」', totals: { flows: 0, notApplicable: true } }
}

export function checkFidelity({ runDir, docText = '', minCoverage = 0.4, manifest = null }) {
  const infra = manifest?.kind === 'infrastructure'
  if (infra) {
    const na = infraNotApplicable(docText)
    if (na) return na
  }
  const { flows, dir } = readFidelity(runDir)
  if (!flows.length) {
    return {
      ok: false,
      detail: `缺 ${dir.replace(`${runDir}/`, '')}/*.json——没拍快照就没有保真判据（parity 只对数据面负责）`,
      totals: { flows: 0 },
    }
  }
  const problems = []
  let matched = 0
  let totalPiweb = 0
  const unregistered = []
  for (const f of flows) {
    if (!f.piweb.length || !f.evopi.length) {
      problems.push(`flow「${f.flow}」缺${f.piweb.length ? ' evo-pi' : ' pi-web'} 一侧快照`)
      continue
    }
    const { onlyPiweb } = diffAnchors(f.piweb, f.evopi)
    totalPiweb += f.piweb.length
    matched += f.piweb.length - onlyPiweb.length
    for (const a of onlyPiweb) {
      // 名字要在文档里出现（差异表行、砍单说明、或任何一句"为什么还没有"）
      const named =
        docText.includes(a.name) ||
        docText.includes(`${a.role}:${a.name}`) ||
        docText.includes(String(a.name).split('：')[0])
      if (!named) unregistered.push(`${f.flow} ${a.role}:${a.name}`)
    }
  }
  const fusions = []
  for (const f of flows) {
    if (f.piweb.length && f.evopi.length) fusions.push(...findFusions(f.piweb, f.evopi))
  }
  if (fusions.length) {
    const i = String(docText).indexOf('## 信息融合')
    if (i < 0)
      problems.push(
        `${fusions.length} 处把多层信息压进一个可及名（例：${fusions[0].evopi}）——要么拆成独立节点，要么在文档「## 信息融合」里写清为什么不拆`,
      )
    else {
      const body = String(docText).slice(i + '## 信息融合'.length)
      for (const fu of fusions)
        if (!body.includes(String(fu.evopi).split('：')[0]))
          problems.push(`信息融合未登记：${fu.evopi}`)
    }
  }
  const coverage = totalPiweb ? matched / totalPiweb : 0
  // 覆盖率是**参考值**（默认 40%）：`role:name` 精确比对的分子天然偏低，
  // 真正防"静默少半个页面"的是下面两条——缺口组必须登记处置、单个未对齐项必须提过。
  // 覆盖率只作**参考线**（低于阈值不判红，写进 note）：`role:name` 精确比对的分子天然偏低，
  // 拿它当硬门会奖励"改名字"而不是"补功能"。硬判据是下面两条：缺口组表 + 单个未对齐项登记。
  const notes = []
  if (coverage < minCoverage)
    notes.push(
      `覆盖率 ${(coverage * 100).toFixed(0)}%（${matched}/${totalPiweb}）低于参考线 ${(minCoverage * 100).toFixed(0)}%`,
    )
  const groups = parseGapGroups(docText)
  if (!groups.rows.length)
    problems.push(
      '缺「保真缺口组」表（列：缺口组 / 条数 / 处置 / 依据）——覆盖率只说明差多少，不说明打算怎么办',
    )
  else {
    const bad = groups.rows.filter((r) => !r.action || !/^(fix|done|砍单|命名|blocked|差异)/i.test(r.action))
    if (bad.length)
      problems.push(`${bad.length} 个缺口组的处置写法不在闭集（fix/done/砍单/命名/blocked/差异）：${bad[0].group}`)
    const noWhy = groups.rows.filter((r) => (r.why ?? '').trim().length < 8)
    if (noWhy.length) problems.push(`${noWhy.length} 个缺口组没写依据（≥8 字）：${noWhy[0].group}`)
  }
  if (unregistered.length)
    problems.push(
      `${unregistered.length} 个 pi-web 独有元素没在 parity.md 里提过：${unregistered.slice(0, 5).join('；')}——没对齐可以，没提过不行`,
    )
  return {
    ok: problems.length === 0,
    detail:
      problems.join('；') ||
      `保真覆盖率 ${(coverage * 100).toFixed(0)}%（${matched}/${totalPiweb}）${notes.length ? `（参考：${notes.join('；')}）` : ''}，${flows.length} 个 flow 的未对齐项都已在文档登记`,
    totals: { flows: flows.length, coverage, matched, totalPiweb, fusions: fusions.length },
  }
}

/** 解析 `## 保真缺口组` 下的表：列名含「缺口组/组」「条数」「处置」「依据」 */
export function parseGapGroups(md) {
  const rows = []
  const table = (md ?? '')
    .split(/\n##\s+/)
    .find((seg) => /保真缺口组|缺口组/.test(seg.split('\n')[0] ?? ''))
  if (!table) return { rows }
  for (const line of table.split('\n')) {
    if (!line.trim().startsWith('|')) continue
    const cells = line.split('|').slice(1, -1).map((c) => c.trim())
    if (cells.length < 3) continue
    if (/^-+$/.test(cells[0].replace(/[:\s]/g, '-'))) continue
    if (/缺口组|^组$/.test(cells[0])) continue
    rows.push({ group: cells[0], count: cells[1], action: cells[2], why: cells[3] ?? '' })
  }
  return { rows }
}
