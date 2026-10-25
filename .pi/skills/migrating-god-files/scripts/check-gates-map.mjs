import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { GATE_META, LAYER_ZH, NEGATIVE_FLOOR, NEGATIVE_TESTS, SEMANTIC_KINDS } from './lib/gatemeta.mjs'
import { PHASES } from './lib/phases.mjs'

// 「门目录」的唯一权威：references/gates.md 里的表由本脚本生成。
//
// 为什么需要它：rules.md 说"20 道门"、phases.mjs 里有 45 个 check kind、
// checks.mjs 里有 N 个 case——三者没有任何机制保证一致。试点里出现过
// "文档写了门、代码里没有"和"实现了门、没有任何阶段用"两种漂移，
// 都是靠人眼发现的。这里把三类事实对齐：
//   used  （phases.mjs 里真的被某个阶段引用）
//   impl  （checks.mjs 里真的有 case）
//   doc   （references/gates.md 里真的有一行）

const HERE = dirname(fileURLToPath(import.meta.url))
const SKILL_ROOT = resolve(HERE, '..')
const GATES_PATH = resolve(SKILL_ROOT, 'references/gates.md')

// 人话说明：kind → 一句话判据。新增 kind 必须在这里登记，否则 --write 会报"缺说明"。
const DESCRIPTIONS = {
  file: '文件存在且 ≥ minBytes',
  glob: 'glob 命中的文件数 ≥ min',
  heading: '含精确标题',
  headingAny: '含任一候选标题',
  sectionClean: '小节内没有占位符/空行占位',
  lines: '行区间闭合（structure / bind / landed 三档）',
  deliversLineRanges: '交付行区间覆盖/归属正确',
  ownershipTypes: '区间类型合法且 owner/依据齐备',
  symbolNames: '符号名与源码一致',
  symbols: '符号全集 ⊆ 符号表，且空归属数 0',
  lspSource: '符号分母来自 tsserver 采集（meta 一致）',
  surface: '表面枚举存在且按 kind 分账',
  coverage: '覆盖 ≥ 阈值',
  specTests: '规格里的测试 ID 已落地',
  specs: '决策表/规格有证据锚点且无占位',
  behaviors: '每条行为有源码证据与脚本 id',
  behaviorScripts: '行为与脚本双向绑定',
  plan: '任务表列齐且非空（S/M 级）',
  trace: '四向追踪闭合（任务↔元素↔行为↔验收）',
  quality: '质量预算与验收命令存在',
  drift: 'OpenWiki 未过期',
  contracts: '外部接口契约文件齐备',
  schema: 'DTO 与 zod schema 成对',
  fixtures: '夹具 ≥ min 行或 ≥ min 文件',
  wireTable: '命令表/事件表非空',
  contractAlign: '契约对齐表每行都指向契约/变更单',
  contractDelta: '差异收敛成 CHG 变更单',
  contractInventory: '源码端点/命令 ⊆ 契约',
  externalIo: 'god 不写 fetch 时，沿 import 追到的命令也要在契约里',
  harness: 'registry 结构合法（captured 带快照、manual 带理由）',
  verification: 'gates/<id>.json 有运行记录且全 exit 0、未过期',
  conventions: '分层事实：layerPaths 必须指向仓库真实目录，AD 必须讲这个仓库',
  fidelity: 'pi-web 独有的可及元素必须在 parity.md 有名有姓；覆盖率低于阈值判红',
  webScaffold: 'web 新代码只能落在 features/<slice>/ 等允许的根下，切片要有 hook/view 骨架 + 参照模板',
  placement: '落点在已声明的层里；adapters 不许写进 web；客户端不许 import node:*',
  runtimeFit: '业务规则住 core、呈现逻辑住 web（ADR-0001 的分层是运行时，不是路径）',
  review: '双轴审查（Standards + Spec）无 ❌',
  volume: '判断型文档 ≤ 行数上限',
  capSpec: '规格里有用户故事、多文件多行区间覆盖、交互形态与 pi-web 布局映射',
  denominator: '台账分母与来源文件条数/sha 一致（手填分母不认）',
  observations: '界面任务实施前要写 observations/<T-xx>.md（看到什么/差在哪/决定）',
  renderBoundary: '本能力渲染哪几个区域、哪些是别的能力的 chrome（CHARTER 的 ## 渲染边界）',
  readlogCoverage: '原型里画了谁的界面，就得先读过谁（readlog 必须有记录）',
  changePropagation: '砍单/改契约时有变更单，视图打勾齐全，skip 有理由',
  envReady: '端口/变量/构建/版本/夹具成文，关键条目在册',
  uiProto: 'ASCII 原型：主屏与空态两块，含交互态',
  humanSignoff: '这几份产物必须人工签字，agent 代签判红',
  parity: '重建后行为/结构对账通过',
  programPrereq: 'program run 的前置产物存在',
  programAudit: 'program run 审计通过',
  rlevel: 'R 级已声明',
  godFingerprint: 'hashes 与当前文件一致',
  godRegistry: 'god 在 GODS.md 登记',
  godRegistryClosed: 'GODS.md 登记集合闭合',
  godsHaveR: '每个 god 有 R 级',
  godStatus: 'god 状态已收口',
  capabilityPlan: '能力清单/拓扑序/裁线齐备',
  archRules: 'arch/rules.json 结构合法',
  frontendArch: '前端约定八节齐备 + rules.json#frontend（层/状态分类/禁止写法/预算）',
  stubPlan: '契约每条命令/事件都有桩与夹具，blocked 必须写理由',
  stub: '本能力用到的 HTTP 命令桩就绪（桩 + 夹具齐备）',
  integration: '每个 HTTP 命令已换真实现，且留了联调证据',
  acceptance: '验收阶梯 L1–L4(/L5) 达标；L6 需人签',
  commMatrix: '通信矩阵每类交互唯一机制且有反例',
  signoff: '人已送签',
  design: 'D1–D16 设计门',
  retro: '复盘含遗留项',
  decisionsClosed: '决策全部关闭',
}

const internal = new Set(['produces']) // 由 runPhaseChecks 统一追加，不对应 kind

function collect() {
  const used = new Map()
  for (const p of PHASES) {
    for (const c of p.checks || []) {
      if (!c?.kind || internal.has(c.kind)) continue
      if (!used.has(c.kind)) used.set(c.kind, new Set())
      used.get(c.kind).add(p.id)
    }
  }
  const checksSrc = readFileSync(resolve(SKILL_ROOT, 'scripts/lib/checks.mjs'), 'utf8')
  const impl = new Set([...checksSrc.matchAll(/case '([A-Za-z]+)':/g)].map((m) => m[1]))
  return { used, impl }
}

function render(used) {
  // 三层视图：存在性（最容易被占位骗过）/ 结构（可复算）/ 语义（机器判不了，必须人签）
  const rows = [...used.keys()]
    .sort()
    .map((kind) => {
      const phases = [...used.get(kind)].sort().join(' / ')
      const desc =
        DESCRIPTIONS[kind] || '（缺说明：在 scripts/lib/gates-map.mjs 的 DESCRIPTIONS 里登记）'
      const m = GATE_META[kind]
      const layer = m ? LAYER_ZH[m.layer] : '**未登记**'
      const can = m?.canCatch || '—'
      const cannot = m?.cannotCatch || '—'
      const neg = NEGATIVE_TESTS[kind] ? `✅ ${NEGATIVE_TESTS[kind]}` : '—'
      return `| \`${kind}\` | ${layer} | ${phases} | ${desc} | ${can} | ${cannot} | ${neg} |`
    })
  return [
    '<!-- KINDS:START（由 scripts/check-gates-map.mjs --write 生成，勿手改） -->',
    '| kind | 层级 | 用在 | 判据 | 能抓 | 抓不到 | 反向用例 |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    ...rows,
    '<!-- KINDS:END -->',
  ].join('\n')
}

function rulesCount() {
  const p = resolve(SKILL_ROOT, 'references/rules.md')
  if (!existsSync(p)) return { declared: null, rows: null }
  const s = readFileSync(p, 'utf8')
  const declared = Number(s.match(/\*\*有\s*(\d+)\s*道串联的门\*\*/)?.[1] || NaN)
  const rows = (s.match(/^\|\s*\*\*(\d+)\*\*\s*\|/gm) || []).length
  return { declared, rows }
}

function check({ write } = {}) {
  const { used, impl } = collect()
  const problems = []
  for (const kind of used.keys())
    if (!impl.has(kind)) problems.push(`阶段引用了 \`${kind}\` 但 checks.mjs 没有实现`)
  for (const kind of impl)
    if (!used.has(kind)) problems.push(`checks.mjs 实现了 \`${kind}\` 但没有任何阶段使用（死门）`)
  for (const kind of used.keys())
    if (!DESCRIPTIONS[kind])
      problems.push(`\`${kind}\` 没有登记人话说明（gates-map.mjs DESCRIPTIONS）`)

  // P1：每个 kind 都要有"能抓/抓不到"的登记——门的能力边界必须写下来
  for (const kind of used.keys()) {
    const m = GATE_META[kind]
    if (!m) {
      problems.push(`\`${kind}\` 没有能力元数据（scripts/lib/gatemeta.mjs 的 GATE_META）`)
      continue
    }
    if (!m.layer || !LAYER_ZH[m.layer]) problems.push(`\`${kind}\` 的 layer 非法`)
    if (!m.canCatch || !m.cannotCatch)
      problems.push(`\`${kind}\` 缺 canCatch / cannotCatch——必须写清它能抓什么、抓不到什么`)
  }
  for (const kind of Object.keys(GATE_META))
    if (!used.has(kind)) problems.push(`GATE_META 里有 \`${kind}\`，但没有任何阶段使用（残留元数据）`)

  // 语义层的门必须有人工仲裁点：机器判不了的事不能假装判了
  for (const p of PHASES) {
    const kinds = (p.checks || []).map((c) => c?.kind)
    if (!kinds.some((k) => SEMANTIC_KINDS.has(k))) continue
    if (!kinds.includes('humanSignoff'))
      problems.push(`阶段 ${p.id} 有语义门却没有 humanSignoff——机器判不了的事必须人签`)
  }

  // 反向用例：表里的标签必须真在 selftest.mjs 里；覆盖率太低说明门在裸奔
  const selftestSrc = readFileSync(resolve(SKILL_ROOT, 'scripts/selftest.mjs'), 'utf8')
  for (const [kind, label] of Object.entries(NEGATIVE_TESTS)) {
    if (!selftestSrc.includes(label))
      problems.push(`\`${kind}\` 登记的反向用例「${label}」在 selftest.mjs 里找不到`)
  }
  const missingNeg = [...used.keys()].filter((k) => !NEGATIVE_TESTS[k])
  const coverage = 1 - missingNeg.length / used.size
  if (coverage < NEGATIVE_FLOOR)
    problems.push(
      `反向用例覆盖率 ${(coverage * 100).toFixed(0)}% < ${(NEGATIVE_FLOOR * 100).toFixed(0)}%：${missingNeg.length} 个 kind 没有"必须红"的用例`,
    )

  const { declared, rows } = rulesCount()
  if (declared != null && rows != null && declared !== rows)
    problems.push(`rules.md 声称 ${declared} 道门，门表实际 ${rows} 行`)

  if (!existsSync(GATES_PATH)) problems.push('references/gates.md 不存在')
  else {
    const current = readFileSync(GATES_PATH, 'utf8')
    const next = render(used)
    const hasBlock = current.includes('<!-- KINDS:START')
    if (write) {
      const out = hasBlock
        ? current.replace(/<!-- KINDS:START[\s\S]*?<!-- KINDS:END -->/, next)
        : `${current.trimEnd()}\n\n${next}\n`
      writeFileSync(GATES_PATH, out)
    } else if (!hasBlock) problems.push('references/gates.md 缺 KINDS 区块（先跑 --write）')
    else if (current.replace(/<!-- KINDS:START[\s\S]*?<!-- KINDS:END -->/, next) !== current)
      problems.push('references/gates.md 的 kind 表与 phases.mjs 不一致（跑 --write）')
  }
  return { problems, kinds: used.size, impl: impl.size, missingNeg }
}

export { check, collect, render }

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const write = process.argv.includes('--write')
  const { problems, kinds, missingNeg } = check({ write })
  if (write) console.log(`✅ 已按 ${kinds} 个 kind 重写 references/gates.md`)
  if (problems.length) {
    console.error('❌ 门目录与实现不一致：')
    for (const p of problems) console.error(`  - ${p}`)
    process.exit(1)
  }
  if (!write) {
    console.log(`✅ ${kinds} 个门 kind：阶段引用、checks.mjs 实现、gates.md 登记三者一致`)
    console.log(
      `   反向用例 ${kinds - (missingNeg?.length ?? 0)}/${kinds}；尚无反向用例：${(missingNeg || []).join('、') || '无'}`,
    )
  }
}
