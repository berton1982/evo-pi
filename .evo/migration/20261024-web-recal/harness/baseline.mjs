#!/usr/bin/env node
// 由两份快照生成「逐项清单」。数字全部来自快照，不由人报——
// 这样"42.5%"这类结论可以复算，修一条只需把对应行状态从 todo 改成 done。
//
// 用法：node <run>/harness/baseline.mjs [--flow shell] [--out evidence/shell-baseline.md]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const RUN = resolve(import.meta.dirname, '..')
const arg = (n, d) => {
  const i = process.argv.indexOf(n)
  return i > 0 ? process.argv[i + 1] : d
}
const flow = arg('--flow', 'shell')
const outRel = arg('--out', `evidence/${flow}-baseline.md`)
const dir = resolve(RUN, 'harness/snapshot/fidelity')

const read = (side) => {
  const p = resolve(dir, `${flow}.${side}.json`)
  if (!existsSync(p)) {
    console.error(`缺快照 ${p}——先跑 harness/fidelity.mjs --flow ${flow}`)
    process.exit(2)
  }
  return JSON.parse(readFileSync(p, 'utf8'))
}

const pi = read('piweb')
const evo = read('evopi')

// 同名不同状态后缀（「alpha：已开启」vs「alpha：测试时已连接」）不算两条元素——与门保持同一口径
// 开关类标签是**状态**不是身份：pi-web 收起时叫"显示文件面板"、展开时叫"隐藏文件面板"，
// 两边默认态不同就会互相记成"缺失"。归一成同一个身份名再比对。
const TOGGLE = /^(?:显示|隐藏|打开|关闭|开启|启用|停用)(.+)$/
const baseName = (s) => {
  const stripped = s.replace(/[：:].*$/, '').trim()
  const tg = TOGGLE.exec(stripped)
  return (tg ? tg[1] : stripped).trim()
}
const SYNO = new Map([
  ['files', '文件'], ['file', '文件'], ['sessions', '会话'], ['session', '会话'],
  ['new', '新建会话'], ['settings', '设置'], ['search', '搜索'],
])
const keyOf = (e) => {
  const n = baseName(e.name).toLowerCase()
  return `${e.role}|${SYNO.get(n) ?? n}`
}

const index = (list) => {
  const m = new Map()
  for (const e of list) {
    if (e.visible === false) continue
    const k = keyOf(e)
    if (!m.has(k)) m.set(k, e)
  }
  return m
}
const piIdx = index(pi.entries)
const evoIdx = index(evo.entries)
const matched = [...piIdx.keys()].filter((k) => evoIdx.has(k))
const onlyPi = [...piIdx.keys()].filter((k) => !evoIdx.has(k))
const onlyEvo = [...evoIdx.keys()].filter((k) => !piIdx.has(k))

// 分组：按区域归类，缺区域时按名字猜——猜出来的组要能被人一眼否掉（写"未归类"）
const groups = [
  ['项目选择器', /项目|新建会话|版本|parity|evo-pi|cwd/],
  ['文件区', /文件|树|搜索文件|隐藏|变更/],
  ['会话区', /会话|tab|列表/],
  ['设置', /设置|外观|字体|语言/],
  ['顶栏与区域语义', /./],
]
const groupOf = (e) => {
  const hay = `${e.region ?? ''} ${e.name}`
  for (const [g, re] of groups) if (re.test(hay)) return g
  return '未归类'
}

// 保留人写过的「状态 / 处置依据」：手册每次复算都会重写，
// 如果整表覆盖，人填的判断会被悄悄抹掉（第一次跑就发生了，5 条处置全丢）。
const outPathEarly = resolve(RUN, outRel)
const keep = new Map()
if (existsSync(outPathEarly)) {
  for (const line of readFileSync(outPathEarly, 'utf8').split('\n')) {
    if (!line.startsWith('| ')) continue
    // 按 | 切列，不要用一条大正则去猜列宽：上一版正则要求"末尾紧跟 |"，
    // 人手填的 `| done | <依据> |` 被静默丢弃，24 条处置全变成了 todo。
    const cols = line.split('|').slice(1, -1).map((c) => c.trim())
    if (cols.length < 7 || !/^\d+$/.test(cols[0])) continue
    const el = cols[2].replace(/^`|`$/g, '')
    if (!el.includes(':')) continue
    keep.set(el, { status: cols[5] || 'todo', why: cols[6] || '' })
  }
}

// 人工判断放独立 JSON：md 是纯生成物，重算不会覆盖人的结论；
// 上一版直接在 md 里正则找 `| todo |` 填处置，格式稍变（多一个空格）就静默失效，
// 24 条处置全丢过一次。
const dispPath = resolve(RUN, 'evidence/shell-dispositions.json')
const disp = existsSync(dispPath) ? JSON.parse(readFileSync(dispPath, 'utf8')) : {}

const rows = onlyPi.map((k) => {
  const e = piIdx.get(k)
  return { k, role: e.role, name: e.name, region: e.region ?? '—', keys: e.keys ?? '—', group: groupOf(e) }
})
const byGroup = new Map()
for (const r of rows) {
  if (!byGroup.has(r.group)) byGroup.set(r.group, [])
  byGroup.get(r.group).push(r)
}

const cov = piIdx.size ? (matched.length / piIdx.size) * 100 : 0
const md = [
  `# ${flow} 保真基线（逐项清单）`,
  '',
  `> 快照：\`harness/snapshot/fidelity/${flow}.{piweb,evopi}.json\`（采集 ${pi.capturedAt}）`,
  `> 由 \`harness/baseline.mjs\` 生成，**状态列由人改，其余数字全部来自快照**。`,
  '> 复算：`node .evo/migration/20261024-web-recal/harness/baseline.mjs --flow ' + flow + '`',
  '',
  '## 总量',
  '',
  '| 口径 | 数 |',
  '|---|---|',
  `| pi-web 可见元素 | ${piIdx.size} |`,
  `| evo-pi 可见元素 | ${evoIdx.size} |`,
  `| 已对齐 | ${matched.length} |`,
  `| **覆盖率** | **${cov.toFixed(1)}%** |`,
  `| 只有 pi-web 有 | ${onlyPi.length} |`,
  `| 只有 evo-pi 有（信息融合/多出来的，需要人工判断） | ${onlyEvo.length} |`,
  '',
  '## 逐项清单（只有 pi-web 有的）',
  '',
  '| # | 缺口组 | 元素 | 区域 | 快捷键 | 状态 | 处置依据 |',
  '|---|---|---|---|---|---|---|',
]
let i = 0
for (const g of [...byGroup.keys()].sort()) {
  for (const r of byGroup.get(g)) {
    i += 1
    const key = `${r.role}:${r.name.slice(0, 40)}`
    const prev = disp[key] ?? keep.get(key)
    const status = prev?.status && prev.status !== '' ? prev.status : 'todo'
    const why = prev?.why && prev.why !== '' ? prev.why : ''
    md.push(`| ${i} | ${r.group} | \`${key}\` | ${r.region} | ${r.keys} | ${status} | ${why} |`)
  }
}
md.push('', '## 只有 evo-pi 有（多出来的）', '', '| # | 元素 | 区域 | 人工判断 |', '|---|---|---|---|')
onlyEvo.forEach((k, n) => {
  const e = evoIdx.get(k)
  md.push(`| ${n + 1} | \`${e.role}:${e.name.slice(0, 40)}\` | ${e.region ?? '—'} | |`)
})
md.push(
  '',
  '## 分组小计',
  '',
  '| 缺口组 | 条数 | 已完成 |',
  '|---|---|---|',
  ...[...byGroup.entries()].sort().map(([g, list]) => `| ${g} | ${list.length} | 0 |`),
  '',
  '## 规矩',
  '',
  '1. **状态只由人改**：`todo` → `done` 必须同时留 `处置依据`（`文件:行` 或 e2e 用例名），否则下次复算仍是 todo。',
  '2. **多出来的元素先当缺口看**：可能是信息融合（一个节点塞两个概念），要填 `## 信息融合` 说明。',
  '3. **覆盖率降不算退步**：pi-web 侧新增元素会让分母变大，报告里要写清"分母变了"。',
  '',
)
const outPath = outPathEarly
mkdirSync(dirname(outPath), { recursive: true })
writeFileSync(outPath, md.join('\n'))
console.log(`pi-web ${piIdx.size} / evo-pi ${evoIdx.size} / 对齐 ${matched.length} / 覆盖率 ${cov.toFixed(1)}%`)
console.log(`只有 pi-web 有 ${onlyPi.length} 条，分组：${[...byGroup.entries()].map(([g, l]) => `${g} ${l.length}`).join(' / ')}`)
console.log(`写入 ${outPath}`)
