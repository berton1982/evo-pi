#!/usr/bin/env node
// 迁移工作流状态机。
//
// 唯一职责：把「我做到哪一步了」变成机器可读的事实，让**新 session 三分钟内接上**。
// 状态只由本脚本写，agent 不得手改 state.json（手改 = 下一个 session 读到的进展是假的）。
//
// 四个作用域各自独立建档（互不污染）：
//   program    纲领/契约/骨架/全局架构/切片/割接预案
//   chassis    底盘契约/布局/框架/验收
//   capability 每个能力一个 run（--program 关联纲领，--rlevel 决定门强度）
//   cutover    预演/割接/复盘
//
// 用法：见 state.mjs --help
// 退出码: 0 = 成功；1 = 阶段门未过（拒绝推进）；2 = 用法/环境错误

import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runPhaseChecks } from './lib/checks.mjs'
import { symbolsMetaFor } from './lib/parity.mjs'
import {
  firstPhaseId,
  LEVELS,
  nextPhaseId,
  phaseById,
  phasesOf,
  SCOPE_PHASES,
  SCOPES,
  SKILL_NAME,
  SKILL_VERSION,
} from './lib/phases.mjs'
import { countLines, ensureDir, readState, sha1File, writeState } from './lib/store.mjs'
import { TEMPLATE_MAP } from './lib/templates.mjs'

const argv = process.argv.slice(2)
const cmd = argv[0]
const flag = (name, dflt = null) => {
  const i = argv.indexOf(`--${name}`)
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : dflt
}
const multi = (name) => {
  const out = []
  argv.forEach((a, i) => {
    if (a === `--${name}` && argv[i + 1]) out.push(argv[i + 1])
  })
  return out
}
const has = (name) => argv.includes(`--${name}`)
const root = resolve(flag('root', '.'))
const die = (msg) => {
  console.error(`\u274c ${msg}`)
  process.exit(2)
}

const KNOWN_CMDS = [
  'init',
  'god',
  'surface',
  'step',
  'record',
  'signoff',
  'unsign',
  'registry',
  'change',
  'decide',
  'command',
  'task',
  'pause',
  'resume',
  'reopen',
  'status',
  'advance',
]
const FLAGS = {
  init: ['--run', '--root', '--god', '--scope', '--rlevel', '--program'],
  god: ['--run', '--root', '--id', '--symbols', '--source', '--from-meta'],
  surface: ['--run', '--root', '--count'],
  step: ['--run', '--root', '--id'],
  record: ['--run', '--root', '--artifact'],
  signoff: ['--run', '--root', '--artifact', '--by', '--saw', '--reauth'],
  unsign: ['--run', '--root', '--artifact'],
  registry: ['--run', '--root', '--rebaseline', '--reason'],
  change: ['--run', '--root', '--id', '--summary'],
  decide: ['--run', '--root', '--id', '--text', '--close'],
  command: ['--run', '--root', '--cmd', '--exit'],
  task: ['--run', '--root', '--id', '--status'],
  pause: ['--run', '--root', '--note'],
  resume: ['--run', '--root'],
  reopen: ['--run', '--root', '--reason'],
  status: ['--run', '--root', '--no-write'],
  advance: ['--run', '--root'],
}

function readHelp() {
  return [
    'state.mjs — 迁移工作流状态机（四作用域）',
    '',
    '  init     --run <dir> --scope <program|chassis|capability|cutover> [--god <path>...]',
    '           [--rlevel R1|R2|R3] [--program <dir>]',
    '  god      --run <dir> --id <basename> --from-meta | --symbols <n> --source LSP',
    '  surface  --run <dir> --count <n>                     登记表面点总数',
    '  step     --run <dir> --id <e.g. c4.3>                标记子步骤完成',
    '  record   --run <dir> --artifact <relpath>            登记产物指纹',
    '  signoff  --run <dir> --artifact <relpath> --by user --saw "看了什么"  登记签字\n             改动后改签必须由原签字人带 --reauth（换人先 unsign）\n  unsign   --run <dir> --artifact <relpath>                        撤销签字（移交前用）',
    '  change   --run <dir> --id CHG-001 --summary "砍了 Code mode"  生成变更传播单',
    '  decide   --run <dir> --id Q1 --text ... [--close Q1] 登记/关闭待决项',
    '  command  --run <dir> --cmd ... --exit 0              记录最近一次命令',
    '  task     --run <dir> --id T-01 --status doing|done|todo  任务台账（续跑粒度）',
    '  pause    --run <dir> [--note ...]                    暂停（记录原因）',
    '  resume   --run <dir>                                 恢复',
    '  reopen   --run <dir> --reason ...                    重开已关闭的 run',
    '  status   --run <dir> [--no-write]                    打印进展并刷新 PROGRESS.md',
    '  advance  --run <dir>                                 过门后推进到下一阶段',
    '',
    '状态文件：<run>/state.json（只由本脚本写）',
  ].join('\n')
}

if (!cmd || cmd === '--help' || cmd === '-h') {
  console.log(readHelp())
  process.exit(cmd ? 0 : 2)
}
if (!KNOWN_CMDS.includes(cmd)) die(`未知子命令: ${cmd}（可用：${KNOWN_CMDS.join(' / ')}）`)
for (let i = 1; i < argv.length; i++) {
  const a = argv[i]
  if (!a.startsWith('-')) continue
  if (!FLAGS[cmd].includes(a)) die(`未知参数: ${a}（${cmd} 支持 ${FLAGS[cmd].join(' ')}）`)
  if (!['--no-write'].includes(a)) i++
}

const runDirArg = flag('run')
if (!runDirArg) die('缺 --run <dir>（迁移立案目录，如 .evo/migration/<YYYYMMDD>-<名>）')
const runDir = resolve(root, runDirArg)

function blankState(scope) {
  return {
    schemaVersion: 3,
    skill: SKILL_NAME,
    skillVersion: SKILL_VERSION,
    createdAt: new Date().toISOString(),
    updatedAt: null,
    scope,
    rLevel: null,
    programRun: null,
    gods: [],
    godRegistry: { path: '.evo/migration/GODS.md', sha1: null },
    surfaceCount: 0,
    phase: firstPhaseId(scope),
    phaseStatus: 'in_progress',
    phases: {},
    substeps: {},
    artifacts: {},
    signoffs: {},
    decisions: [],
    tasks: {},
    history: [],
    paused: false,
    lastCommand: null,
    closed: false,
  }
}

// ---- 模板铺底 ----
// 为什么默认铺：试运行时 18 个必需产物里有 11 个是逐字手写的，模板明明存在却没人去看
// （init 不提示、check-phase 红条也不给模板路径）。铺底 + 顶部 TODO 注释把这一步变成默认行为。
// 模板目录與「階段→模板」對照都在 lib/templates.mjs（唯一事實來源），
// 這裡只負責把它們複製到 run 裡並加 TODO 橫幅。
const TEMPLATE_DIR = fileURLToPath(new URL('../references/templates/', import.meta.url))

/** run 目录名 → 能力代号（`20261021-C-H-skills-config` → `C-H`）。 */
const capIdOf = (name) => {
  const m = name.match(/([A-Z]-[A-Z])/)
  return m ? m[1] : name
}

function scaffold(runDirAbs, runName, scope, gods, force) {
  const map = TEMPLATE_MAP[scope] || {}
  const cap = capIdOf(runName)
  const god = gods.length ? basename(gods[0].path) : '<god>'
  const created = []
  for (const [from, to] of Object.entries(map)) {
    const src = join(TEMPLATE_DIR, from)
    const dst = join(runDirAbs, to)
    if (!existsSync(src)) continue
    if (existsSync(dst) && !force) continue
    mkdirSync(dirname(dst), { recursive: true })
    const body = readFileSync(src, 'utf8')
      .replaceAll('<run>', runName)
      .replaceAll('<god>', god)
      .replaceAll('<cap>', cap)
    // 横幅必须与文件格式兼容：JSON 里塞 <!-- --> 会让它直接不是 JSON（第一次铺底就踩到了）。
    // 三种标记都带同一个 token `TODO-init-scaffold`，check-phase 靠它判「模板还没填」。
    const banner = to.endsWith('.json')
      ? `{\n  "//TODO-init-scaffold": "由 state.mjs init 从 templates/${from} 铺底，填完删掉本行",\n  `
      : [
          `<!-- TODO-init-scaffold（由 state.mjs init 从 references/templates/${from} 铺底）`,
          `     1. 逐节把占位符换成真实内容（不要留 <...>）`,
          `     2. 填完后删掉这段注释——留着的 TODO 就是没做完`,
          `-->`,
          '',
          '',
        ].join('\n')
    if (to.endsWith('.json')) {
      const jsonBody = readFileSync(src, 'utf8')
        .replaceAll('<run>', runName)
        .replaceAll('<god>', god)
        .replaceAll('<cap>', cap)
        .trimStart()
      // 把模板的首个 `{` 让给横幅，其余内容原样接上，保证输出仍是合法 JSON
      const rest = jsonBody.startsWith('{') ? jsonBody.slice(1).replace(/^\s*\n/, '') : jsonBody
      writeFileSync(dst, `${banner}${rest}`)
      created.push(to)
      continue
    }
    writeFileSync(dst, banner + body)
    created.push(to)
  }
  return created
}

// ---- init ----
if (cmd === 'init') {
  const scope = flag('scope', 'capability')
  if (!SCOPES.includes(scope)) die(`未知作用域: ${scope}（可用：${SCOPES.join(' / ')}）`)
  const rlevel = flag('rlevel')
  if (rlevel && !LEVELS.includes(rlevel)) die(`未知 R 级: ${rlevel}`)
  if (scope === 'capability' && !rlevel)
    die('capability run 必须给 --rlevel R1|R2|R3（门强度由它决定）')
  const programArg = flag('program')
  if (scope !== 'program' && !programArg) {
    die(`${scope} run 必须给 --program <dir>（引用纲领 run，否则前置产物无法校验）`)
  }
  if (programArg && !existsSync(resolve(root, programArg))) die(`program run 不存在: ${programArg}`)

  const gods = []
  for (const p of multi('god')) {
    const abs = resolve(root, p)
    if (!existsSync(abs)) die(`god 文件不存在: ${p}`)
    gods.push({
      path: relative(root, abs),
      lines: countLines(abs),
      sha1: sha1File(abs),
      symbols: 0,
      symbolSource: null,
    })
  }

  const state = blankState(scope)
  state.gods = gods
  state.rLevel = rlevel || null
  state.programRun = programArg ? relative(root, resolve(root, programArg)) : null
  const regPath = resolve(root, '.evo/migration/GODS.md')
  if (existsSync(regPath)) state.godRegistry.sha1 = sha1File(regPath)
  state.run = relative(root, runDir)
  state.phases[state.phase] = { startedAt: new Date().toISOString(), doneAt: null }
  ensureDir(runDir)
  for (const d of ['evidence', 'gates', 'plans']) mkdirSync(join(runDir, d), { recursive: true })
  if (scope === 'program') {
    for (const d of ['contracts', 'harness', 'fixtures', 'arch'])
      mkdirSync(join(runDir, d), { recursive: true })
  }
  writeState(runDir, state)

  const useTemplate = !argv.includes('--no-template')
  const made = useTemplate
    ? scaffold(runDir, basename(runDir), scope, gods, argv.includes('--force'))
    : []

  console.log(`\u2705 建档 ${state.run}（scope=${scope}${rlevel ? ` level=${rlevel}` : ''}）`)
  if (useTemplate) {
    console.log(
      made.length
        ? `   铺底模板：${made.join(', ')}`
        : '   铺底模板：无（该作用域没有模板，按 workflow.md 逐项手写）',
    )
  }
  for (const g of gods) console.log(`   ${g.path}  ${g.lines} 行  sha1 ${g.sha1.slice(0, 7)}`)
  if (state.programRun) console.log(`   纲领 run: ${state.programRun}`)
  if (!existsSync(regPath)) console.log('   \u26a0 全景表不存在——P0 会先抓这个')
  const p = phaseById(state.phase)
  console.log(`\n第一阶段：${p.id} ${p.name} — ${p.goal}`)
  console.log(`第一子步骤：${p.substeps[0].id} ${p.substeps[0].task}`)
  process.exit(0)
}

// 其余子命令都要先有 state.json
let state
try {
  state = readState(runDir)
} catch (e) {
  die(e.message)
}
const save = () => writeState(runDir, state)
const currentPhase = () => phaseById(state.phase)

// ---- god ----
if (cmd === 'god') {
  const id = flag('id')
  if (!id) die('缺 --id <basename>')
  const g = state.gods.find((x) => basename(x.path) === basename(id))
  if (!g)
    die(
      `未知 god: ${id}（本 run 涉及：${state.gods.map((x) => basename(x.path)).join(', ') || '无'}）`,
    )
  const symbols = Number(flag('symbols', '0'))
  const source = flag('source')
  if (has('from-meta')) {
    // 从采集证据诚实回填：只有 tsserver 模式才能记成 LSP。
    // 手填 `--source LSP --symbols 390` 曾让"分母是假的"通过所有门，这里就不再给口子。
    const { meta } = symbolsMetaFor(runDir, basename(g.path))
    if (!meta) die(`缺 evidence/symbols-${basename(g.path)}.meta.json——先跑 enumerate-symbols.mjs`)
    if (meta.mode !== 'tsserver')
      die(
        `符号全集来自 ${meta.mode} 模式（${meta.count} 条）：先按 references/lsp-tooling.md §1.2 把 tsserver 修好`,
      )
    g.symbols = meta.count
    g.symbolSource = 'LSP'
    save()
    console.log(`\u2705 ${basename(g.path)}: ${g.symbols} 声明（来源 tsserver ${meta.tsVersion}）`)
    process.exit(0)
  }
  if (symbols) g.symbols = symbols
  if (source) g.symbolSource = source
  save()
  console.log(`\u2705 ${basename(g.path)}: ${g.symbols} 声明（来源 ${g.symbolSource}）`)
  process.exit(0)
}

// ---- surface ----
if (cmd === 'surface') {
  const n = Number(flag('count', '0'))
  if (!n) die('缺 --count <n>（取自 surface.json 的 totals.points）')
  state.surfaceCount = n
  save()
  console.log(`\u2705 表面点总数 ${n}`)
  process.exit(0)
}

// ---- step ----
if (cmd === 'step') {
  const id = flag('id')
  if (!id) die('缺 --id <e.g. c4.3>')
  const phase = currentPhase()
  if (!phase.substeps.some((s) => s.id === id)) {
    die(
      `${id} 不属于当前阶段 ${phase.id}（${phase.id} 的子步骤：${phase.substeps.map((s) => s.id).join(', ')}）`,
    )
  }
  state.substeps[phase.id] = state.substeps[phase.id] || {}
  state.substeps[phase.id][id] = new Date().toISOString()
  save()
  console.log(`\u2705 ${phase.id} ${id} 完成`)
  process.exit(0)
}

// ---- record ----
if (cmd === 'record') {
  const a = flag('artifact')
  if (!a) die('缺 --artifact <relpath>')
  const p = resolve(runDir, a)
  if (!existsSync(p)) die(`产物不存在: ${a}`)
  state.artifacts[a] = { sha1: sha1File(p), bytes: statSync(p).size, at: new Date().toISOString() }
  save()
  console.log(`\u2705 登记 ${a}`)
  process.exit(0)
}

// ---- change：变更传播单（P3）----
if (cmd === 'change') {
  const id = flag('id')
  if (!id) die('缺 --id CHG-001')
  const summary = flag('summary', '（未写摘要）')
  const dir = resolve(runDir, 'changes')
  mkdirSync(dir, { recursive: true })
  const p = resolve(dir, `${id}.md`)
  if (existsSync(p) && !argv.includes('--force')) {
    die(`${p.replace(`${root}/`, '')} 已存在（改它，或加 --force 重建）`)
  }
  // 视图清单与 lib/changes.mjs 的 REQUIRED_VIEWS 保持一致：单点定义在那边，
  // 这里只负责铺一张人人都能勾的表。
  const views = [
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
  const md = [
    `# 变更传播单 ${id}`,
    '',
    `> 摘要：${summary}`,
    '> 一处砍单/删元素要改 7 个视图。**先列清单，再逐条打勾**；跳过必须写理由（≥10 字）。',
    '> 校验：`check-phase.mjs --phase C5`（changePropagation 门：done 行指向的文件必须存在）。',
    '',
    '| 视图 | 状态 | 说明 |',
    '|---|---|---|',
    ...views.map((v) => `| ${v} | todo |  |`),
    '',
  ].join('\n')
  writeFileSync(p, md)
  console.log(`\u2705 已生成 ${p.replace(`${root}/`, '')}（把 todo 改成 done / skip）`)
  process.exit(0)
}

// ---- signoff ----
// 改签（re-auth）规则：签字之后产物又被改动，必须由**原签字人**重新签，并显式带 --reauth。
// 为什么不是"谁改谁签"：改文件的人（常常是 agent）重签等于自己给自己盖章，复核权就没了。
// 为什么还要 --reauth：默认行为是"新增签字"，改签是有后果的动作（旧记录要进 history 留痕）。
if (cmd === 'signoff') {
  const a = flag('artifact')
  if (!a) die('缺 --artifact <relpath>')
  const p = resolve(runDir, a)
  if (!existsSync(p)) die(`产物不存在: ${a}`)
  const by = flag('by', 'user')
  const saw = flag('saw', '')
  const sha = sha1File(p)
  const prev = state.signoffs[a]
  // 换人必须走 unsign：这一条要在"内容未变"的短路之前判，否则换个名字签会被静默当成无效操作
  if (prev && prev.by !== by) {
    die(
      `改签必须由原签字人执行：上一次是「${prev.by}」，本次是「${by}」。\n` +
        '  · 若确实换人复核，请先执行 `state.mjs unsign --run <dir> --artifact ' +
        `${a}\`，再由新签字人签。`,
    )
  }
  if (prev && prev.sha1 === sha) {
    console.log(`✅ ${a} 内容未变，签字仍有效（${prev.by}）`)
    process.exit(0)
  }
  if (prev) {
    if (prev.by !== by)
      die(
        `改签必须由原签字人执行：上一次是「${prev.by}」，本次是「${by}」。\n` +
          '  · 若确实换人复核，请原签字人先执行 `state.mjs unsign --run <dir> --artifact ' +
          `${a}\`，再由新签字人签。`,
      )
    if (!argv.includes('--reauth'))
      die(
        `签字后产物已改动（sha ${prev.sha1.slice(0, 8)} → ${sha.slice(0, 8)}），改签需显式带 --reauth。\n` +
          `  node scripts/state.mjs signoff --run ${runDir} --artifact ${a} --by "${prev.by}" --reauth --saw "…"`,
      )
    if (!saw.trim()) die('改签必须写 --saw（说清这次看了什么，否则等于盖空章）')
    state.signoffs[a] = {
      sha1: sha,
      by,
      saw,
      at: new Date().toISOString(),
      previous: { by: prev.by, sha1: prev.sha1, saw: prev.saw, at: prev.at },
      history: [
        ...(prev.history ?? []),
        { by: prev.by, sha1: prev.sha1, saw: prev.saw, at: prev.at },
      ],
    }
    save()
    console.log(`✅ ${a} 已由 ${by} 改签（--reauth，旧记录已进 history）`)
    process.exit(0)
  }
  state.signoffs[a] = { sha1: sha, by, saw, at: new Date().toISOString() }
  save()
  console.log(`✅ ${a} 已由 ${by} 签字`)
  process.exit(0)
}

// ---- registry（全景表重基线） ----
// C7 要改 `GODS.md` 的状态列（「待开始」→「已完成」），而 `C0:godRegistry` 把
// 「立项后改动全景表」判成漂移——这是对的（立项时看到的邻居/切片结论可能过期）。
// 但收尾时改状态是**正常动作**，所以给一个显式入口：必须写理由，并把旧 sha 记进历史。
// 不给 `--force` 式静默重置，是因为"悄悄把基线挪一下"正是这套流程最想防的事。
if (cmd === 'registry') {
  const reason = flag('reason')
  const regPath = resolve(root, '.evo/migration/GODS.md')
  if (!existsSync(regPath)) die('缺 .evo/migration/GODS.md')
  // 布尔开关：flag() 只在“后面跟了值”时返回真，这里要的是“出现过”
  if (!argv.includes('--rebaseline')) die('只支持 --rebaseline --reason "..."')
  if (!reason || reason.length < 10) die('--reason 至少 10 字：为什么全景表该重基线')
  const next = sha1File(regPath)
  const prev = state.godRegistry?.sha1 ?? null
  if (prev === next) {
    console.log('全景表 sha 未变，无需重基线')
    process.exit(0)
  }
  state.godRegistry = {
    path: '.evo/migration/GODS.md',
    sha1: next,
    history: [
      ...(state.godRegistry?.history ?? []),
      { sha1: prev, at: new Date().toISOString(), reason },
    ],
  }
  save()
  console.log(`✅ 全景表已重基线（${prev?.slice(0, 8) ?? '无'} → ${next.slice(0, 8)}）：${reason}`)
  process.exit(0)
}

// ---- unsign ----
// 移交的唯一正规入口：原签字人（或用户本人）显式撤签，之后新签字人签的字必然是"新增签字"，
// 而不是悄悄覆盖——`humanSignoff` 门会检查 signoffs 里的 previous.by 与 by 是否一致。
if (cmd === 'unsign') {
  const a = flag('artifact')
  if (!a) die('缺 --artifact <relpath>')
  if (!state.signoffs[a]) die(`${a} 本来就没有签字`)
  const prev = state.signoffs[a]
  state.signoffsIndex ??= {}
  state.signoffsIndex[a] = [...(state.signoffsIndex[a] ?? []), prev]
  delete state.signoffs[a]
  save()
  console.log(`✅ 已撤销 ${a} 的签字（原签字人 ${prev.by}）；请新签字人重新签字`)
  process.exit(0)
}

// ---- decide ----
if (cmd === 'decide') {
  const closeId = flag('close')
  if (closeId) {
    const d = state.decisions.find((x) => x.id === closeId)
    if (!d) die(`未知待决项: ${closeId}`)
    d.status = 'closed'
    d.closedAt = new Date().toISOString()
    save()
    console.log(`\u2705 ${closeId} 已关闭`)
    process.exit(0)
  }
  const id = flag('id')
  const text = flag('text')
  if (!id || !text) die('缺 --id 与 --text')
  state.decisions.push({ id, text, status: 'open', at: new Date().toISOString() })
  save()
  console.log(`\u2705 登记待决项 ${id}`)
  process.exit(0)
}

// ---- command ----
if (cmd === 'command') {
  state.lastCommand = {
    cmd: flag('cmd', ''),
    exit: Number(flag('exit', '0')),
    at: new Date().toISOString(),
  }
  save()
  console.log('\u2705 已记录最近一次命令')
  process.exit(0)
}

// ---- task：任务级台账（续跑粒度从"阶段"降到"任务"）----
if (cmd === 'task') {
  const id = flag('id')
  const status = flag('status')
  if (!id) die('缺 --id <T-xx>')
  if (!['todo', 'doing', 'done', 'blocked'].includes(status))
    die('--status 只能是 todo|doing|done|blocked')
  state.tasks[id] = { status, at: new Date().toISOString() }
  save()
  const done = Object.values(state.tasks).filter((x) => x.status === 'done').length
  console.log(`\u2705 ${id} → ${status}（已完成 ${done}/${Object.keys(state.tasks).length}）`)
  process.exit(0)
}

// ---- pause / resume / reopen ----
if (cmd === 'pause' || cmd === 'resume' || cmd === 'reopen') {
  const at = new Date().toISOString()
  if (cmd === 'pause') {
    state.paused = true
    state.history.push({ at, event: 'pause', note: flag('note', '') })
    save()
    console.log('\u23f8 已暂停（state.paused=true）——resume 继续')
    process.exit(0)
  }
  if (cmd === 'resume') {
    state.paused = false
    state.history.push({ at, event: 'resume' })
    save()
    console.log('\u25b6 已恢复')
    process.exit(0)
  }
  const reason = flag('reason')
  if (!reason) die('reopen 必须给 --reason')
  state.closed = false
  state.phaseStatus = 'in_progress'
  state.history.push({ at, event: 'reopen', note: reason })
  save()
  console.log(`\u2705 已重开：${reason}`)
  process.exit(0)
}

// ---- 漂移检测 ----
function staleness() {
  const out = []
  for (const g of state.gods) {
    const p = resolve(root, g.path)
    if (!existsSync(p)) {
      out.push(`${g.path} 已不存在——本 run 结论全部作废`)
      continue
    }
    if (sha1File(p) !== g.sha1) out.push(`${basename(g.path)} 源码变了（C0 指纹失效）→ 回 C0 重跑`)
  }
  const reg = resolve(root, '.evo/migration/GODS.md')
  if (
    existsSync(reg) &&
    state.godRegistry.sha1 &&
    sha1File(reg) !== state.godRegistry.sha1 &&
    !state.closed
  ) {
    out.push('全景表在立项后改动过 → C1/切片结论需复核')
  }
  for (const [a, rec] of Object.entries(state.signoffs)) {
    const p = resolve(runDir, a)
    if (!existsSync(p) || sha1File(p) !== rec.sha1) out.push(`${a} 签字后改动 → 签字失效，重新送签`)
  }
  for (const [a, rec] of Object.entries(state.artifacts)) {
    const p = resolve(runDir, a)
    if (rec.sha1 && existsSync(p) && sha1File(p) !== rec.sha1) out.push(`${a} 登记后被改动`)
  }
  return out
}

function nextSubstep() {
  const phase = currentPhase()
  const done = state.substeps[phase.id] || {}
  return phase.substeps.find((s) => !done[s.id]) || null
}

function renderProgress() {
  const phase = currentPhase()
  const next = nextSubstep()
  const stale = staleness()
  const open = state.decisions.filter((d) => d.status === 'open')
  const done = state.substeps[phase.id] || {}
  const rows = phasesOf(state.scope).map((p) => {
    const rec = state.phases[p.id] || {}
    const mark = rec.doneAt ? 'done' : p.id === state.phase ? `**${state.phaseStatus}**` : 'pending'
    return `| ${p.id} ${p.name} | ${mark} | ${p.produces.join(' / ')} |`
  })
  return `# 迁移进展 — ${state.run}

> 由 \`state.mjs status\` 自动生成。**不要手改**：手改 = 下一个 session 读到的是假进展。
> 生成时间：${new Date().toISOString()}
> 作用域：**${state.scope}**${state.rLevel ? ` · R 级 **${state.rLevel}**` : ''}${state.programRun ? ` · 纲领 \`${state.programRun}\`` : ''}

## 1. 现在在哪

- 阶段：**${phase.id} ${phase.name}**（${state.phaseStatus}）
- 阶段目标：${phase.goal}
- 当前子步骤：${next ? `**${next.id}** ${next.task}` : '（本阶段子步骤全完成，可 advance）'}
- 下一动作：${next ? `按子步骤执行，完成后 \`state.mjs step --id ${next.id}\`` : '`state.mjs advance` 过门推进'}

## 2. 阶段阶梯

| 阶段 | 状态 | 产出 |
|---|---|---|
${rows.join('\n')}

## 3. 本阶段子步骤

${phase.substeps.map((s) => `- [${done[s.id] ? 'x' : ' '}] ${s.id} ${s.task}`).join('\n')}

## 4. 输入与产出

- 输入：${phase.consumes.join(' / ')}
- 产出：${phase.produces.join(' / ')}
- 已登记产物：${Object.keys(state.artifacts).length ? Object.keys(state.artifacts).join(', ') : '（无）'}
- 指纹：${state.gods.length ? state.gods.map((g) => `${basename(g.path)} ${g.lines} 行 sha1 ${g.sha1.slice(0, 7)}${g.symbols ? ` · ${g.symbols} 声明(${g.symbolSource})` : ''}`).join('；') : '（本作用域不涉及具体 god）'}
- 表面点：${state.surfaceCount || 0}

## 5. 漂移与风险

${stale.length ? stale.map((s) => `- \u26a0 ${s}`).join('\n') : '- 无'}

## 5.5 任务台账

${
  Object.keys(state.tasks || {}).length
    ? Object.entries(state.tasks)
        .map(([k, v]) => `- ${k}: **${v.status}**（${v.at}）`)
        .join('\n')
    : '- 无（C5 前为空；C5 起每个 T-xx 一条）'
}

## 6. 待决项

${open.length ? open.map((d) => `- ${d.id} ${d.text}`).join('\n') : '- 无'}

## 7. 签字

${
  Object.keys(state.signoffs).length
    ? Object.entries(state.signoffs)
        .map(([a, r]) => `- ${a} · ${r.by} · ${r.at}`)
        .join('\n')
    : '- 无'
}

## 8. 上次命令

${state.lastCommand ? `\`${state.lastCommand.cmd}\` → exit ${state.lastCommand.exit} @ ${state.lastCommand.at}` : '- 无'}

## 9. 新 session 开场（3 分钟）

1. 读本文件第 1、5、6 节（在哪 / 有什么风险 / 有什么待决）
2. 只读当前阶段那一节：\`references/workflow.md#${phase.id.toLowerCase()}\`
3. 不重读已 done 阶段的产出，除非第 5 节报了漂移
4. 下一步就是第 1 节里的「下一动作」
`
}

// ---- status ----
if (cmd === 'status') {
  const phase = currentPhase()
  const stale = staleness()
  console.log(`目录: ${state.run}`)
  console.log(
    `作用域: ${state.scope}${state.rLevel ? ` · R 级 ${state.rLevel}` : ''}${state.programRun ? ` · 纲领 ${state.programRun}` : ''}`,
  )
  console.log(`阶段: ${phase.id} ${phase.name}（${state.phaseStatus}）— ${phase.goal}`)
  const next = nextSubstep()
  console.log(next ? `下一子步骤: ${next.id} ${next.task}` : '子步骤全完成 → state.mjs advance')
  if (stale.length) {
    console.log('\n\u26a0 漂移:')
    for (const s of stale) console.log(`  - ${s}`)
  }
  if (state.paused) console.log('\n\u23f8 本 run 处于暂停状态（state.mjs resume 恢复）')
  const taskRows = Object.entries(state.tasks || {})
  if (taskRows.length) {
    const by = {}
    for (const [, v] of taskRows) by[v.status] = (by[v.status] || 0) + 1
    console.log(
      `\n任务台账: ${Object.entries(by)
        .map(([k, v]) => `${k} ${v}`)
        .join(' / ')}`,
    )
    const doing = taskRows.filter(([, v]) => v.status === 'doing').map(([k]) => k)
    if (doing.length) console.log(`  进行中: ${doing.join(', ')}`)
  }
  const open = state.decisions.filter((d) => d.status === 'open')
  if (open.length) {
    console.log(`\n待决项 ${open.length} 个:`)
    for (const d of open) console.log(`  - ${d.id} ${d.text}`)
  }
  if (!argv.includes('--no-write')) {
    writeFileSync(resolve(runDir, 'PROGRESS.md'), renderProgress())
    console.log('\n已刷新 PROGRESS.md')
  }
  process.exit(0)
}

// ---- advance ----
if (cmd === 'advance') {
  const phase = currentPhase()
  const report = runPhaseChecks(runDir, phase.id, { root, state })
  if (!report.ok) {
    console.log(`\u274c ${phase.id} 门未过，拒绝推进：`)
    for (const r of report.results) {
      console.log(`  ${r.ok ? '\u2705' : '\u274c'} ${r.detail}  (${r.id})`)
    }
    console.log('\n修完再跑；不许跳过门。')
    process.exit(1)
  }
  state.phases[phase.id] = { ...(state.phases[phase.id] || {}), doneAt: new Date().toISOString() }
  const nx = nextPhaseId(state.scope, phase.id)
  if (!nx) {
    state.phaseStatus = 'done'
    state.closed = true
    save()
    console.log(`\u2705 ${phase.id} 门全过 — 本 run 已关闭`)
    process.exit(0)
  }
  state.phase = nx
  state.phaseStatus = 'in_progress'
  state.phases[nx] = { startedAt: new Date().toISOString(), doneAt: null }
  save()
  const np = phaseById(nx)
  console.log(`\u2705 ${phase.id} 门全过 → 进入 ${nx} ${np.name}`)
  console.log(`   目标: ${np.goal}`)
  console.log(`   第一个子步骤: ${np.substeps[0].id} ${np.substeps[0].task}`)
  process.exit(0)
}

die(`未处理的子命令: ${cmd}（阶段列表：${SCOPE_PHASES[state.scope].join(' → ')}）`)
