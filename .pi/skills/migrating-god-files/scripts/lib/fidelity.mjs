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
const baseName = (s) => norm(s).split('：')[0].split(':')[0].trim()
const keyOf = (a) => `${norm(a.role)}|${baseName(a.name)}`

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

export function checkFidelity({ runDir, docText = '', minCoverage = 0.7 }) {
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
  const coverage = totalPiweb ? matched / totalPiweb : 0
  if (coverage < minCoverage)
    problems.push(`保真覆盖率 ${(coverage * 100).toFixed(0)}%（${matched}/${totalPiweb}）< ${(minCoverage * 100).toFixed(0)}%——差得太多说明只对了一半页面`)
  if (unregistered.length)
    problems.push(
      `${unregistered.length} 个 pi-web 独有元素没在 parity.md 里提过：${unregistered.slice(0, 5).join('；')}——没对齐可以，没提过不行`,
    )
  return {
    ok: problems.length === 0,
    detail:
      problems.join('；') ||
      `保真覆盖率 ${(coverage * 100).toFixed(0)}%（${matched}/${totalPiweb}），${flows.length} 个 flow 的未对齐项都已在 parity.md 登记`,
    totals: { flows: flows.length, coverage, matched, totalPiweb },
  }
}
