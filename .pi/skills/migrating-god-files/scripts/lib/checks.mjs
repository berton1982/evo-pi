// 阶段退出条件的执行器。
// 契约（作用域 / 阶段 / 子步骤 / 检查项）在 lib/phases.mjs；本文件只负责"跑"。
// 设计类门委托给 lib/design.mjs，表格解析委托给 lib/tables.mjs。

import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, join, relative, resolve } from 'node:path'
import { checkCapSpec, checkUiProto } from './capspec.mjs'
import { checkContractAlign, checkContractInventory } from './contracts.mjs'
import { checkFidelity } from './fidelity.mjs'
import { runWebScaffold } from './webscaffold.mjs'
import {
  requiredTiers,
  runAcceptance,
  runIntegration,
  runStubCoverage,
  runStubPlan,
} from './delivery.mjs'
import {
  loadJson,
  parseBehaviors,
  runBehaviorBinding,
  runDesignDrift,
  runDesignGates,
  runQualityBudget,
} from './design.mjs'
import { checkExternalIo } from './external.mjs'
import { runFrontendArch } from './frontend.mjs'
import { readIfExists, runLineCoverage } from './lines.mjs'
import { parseRanges, runOwnershipCoverage, runOwnershipTypes } from './ownership.mjs'
import { readOrNull, runSymbolParity, symbolsFileFor, symbolsMetaFor } from './parity.mjs'
import { checkApplies, phaseById } from './phases.mjs'
import { runSpecGates } from './specs.mjs'
import { countLines, readState, sha1File } from './store.mjs'
import { backticked, columnOf, parseTables, readText, stripCell } from './tables.mjs'
import { runTrace } from './trace.mjs'
import { runChangePropagation } from './changes.mjs'
import { checkEnvDoc } from './envdoc.mjs'
import { checkDenominator, judgeProvenance } from './provenance.mjs'
import { judgeVerification } from './verify.mjs'
import { runVolume } from './volume.mjs'
import { checkConventions } from './conventions.mjs'
import { checkPlacement } from './placement.mjs'
import { checkReview, measureFiles } from './reviewkit.mjs'

const RED = (s) => `\u274c ${s}`
const GREEN = (s) => `\u2705 ${s}`

const bytes = (p) => (existsSync(p) && statSync(p).isFile() ? statSync(p).size : 0)

function section(text, heading) {
  const lines = text.split('\n')
  // 前缀匹配：真实文档标题常带括注（`## 1. 上游（谁消费我）`），精确匹配会让门逼着人改标题。
  const start = lines.findIndex((l) => l.trim().startsWith(heading.trim()))
  if (start < 0) return null
  const level = (heading.match(/^#+/) || ['##'])[0].length
  const out = []
  for (let i = start + 1; i < lines.length; i++) {
    const m = lines[i].match(/^(#+)\s/)
    if (m && m[1].length <= level) break
    out.push(lines[i])
  }
  return out.join('\n')
}

// ── 全景表相关 ─────────────────────────────────────────

// 只认「主表」：表头同时有「路径」与 R 级列。
// 为什么：文档里还有归并登记表、差异表也会提到 god 名；按"第一行包含名字"取行会取错表，
// 造成"缺 R 级"的假失败（实测 mcp-config-helpers 被归并登记表抢走）。
function godTable(md) {
  const tables = parseTables(md || '')
  return (
    tables.find(
      (t) => columnOf(t.header, '路径') >= 0 && t.header.some((h) => /R\s*级/i.test(h)),
    ) ||
    tables.find((t) => columnOf(t.header, '路径') >= 0) ||
    null
  )
}

function godRows(md) {
  const t = godTable(md)
  if (!t) return []
  const pathCol = columnOf(t.header, '路径')
  return t.rows.flatMap((row) => backticked(row[pathCol]).map((n) => ({ name: basename(n), row })))
}

function godNames(md) {
  return [...new Set(godRows(md).map((r) => r.name))]
}

function godRow(md, god) {
  const hit = godRows(md).find((r) => r.name === basename(god.path))
  return hit ? `| ${hit.row.join(' | ')} |` : null
}

// 扫描参考仓库里 >1000 行的生产文件（清单必须封闭）
function oversizedInRepos(root) {
  const base = resolve(root, 'ref_projects/pi-web')
  const out = []
  const skip = /(^|\/)(demo|node_modules|\.next|dist|i18n)(\/|$)/
  const walk = (dir) => {
    if (!existsSync(dir)) return
    for (const e of readdirSync(dir)) {
      const p = join(dir, e)
      if (skip.test(p.replace(base, ''))) continue
      const st = statSync(p)
      if (st.isDirectory()) walk(p)
      else if (/\.(ts|tsx)$/.test(e) && !/\.test\./.test(e) && countLines(p) > 1000) {
        out.push({ name: e, lines: countLines(p), path: p.replace(`${resolve(root)}/`, '') })
      }
    }
  }
  walk(base)
  return out
}

// ── 主入口 ─────────────────────────────────────────────

/**
 * 这个文件还是 `state.mjs init` 铺的模板吗？
 * 模板横幅里带 token `TODO-init-scaffold`（md/json/ts 三种注释风格都有），
 * 只看前 400 字节即可判定。判它的原因：铺底会让「文件在、大小够、标题齐」全部满足，
 * 而正文其实一个字没写——那比不铺底更危险，它会让人误以为这一阶段做完了。
 */
function isUnfilledTemplate(file) {
  try {
    return readFileSync(file, 'utf8').slice(0, 400).includes('TODO-init-scaffold')
  } catch {
    return false
  }
}

/**
 * 语法检查：用 `node --check` 判一个脚本能不能跑。
 * 之所以不 import 试跑：harness 脚本常带顶层副作用（连浏览器、读快照），
 * 语法检查是"可执行"的最小充分证据，且不会在门里产生网络副作用。
 */
function runNodeSyntaxCheck(file) {
  execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' })
}

// produces 与 checks 对齐（S-5）：
// 阶段写了 produces: ['design/manifest.json', ...]，但 checks 常常漏掉其中几项——
// 结果「阶段产出清单」是一句愿望，门只管它关心的那几个文件。
// 这里把 produces 里的**静态文件路径**变成必存项：支持 {a,b} 展开、跳过 glob/目录/带「仅 R」注记项。
// 铺垫路径（GODS.md / CAPABILITIES.md）在 .evo/migration/ 与 run 根两处找。
function expandBraces(p) {
  const m = p.match(/^(.*?)\{(.*)\}(.*)$/)
  if (!m) return [p]
  return m[2].split(',').flatMap((mid) => expandBraces(`${m[1]}${mid.trim()}${m[3]}`))
}

function isScaffoldFile(file) {
  try {
    return readFileSync(file, 'utf8').slice(0, 500).includes('TODO-init-scaffold')
  } catch {
    return false
  }
}

export function producesMissing(runDir, phaseId, { root = process.cwd() } = {}) {
  const phase = phaseById(phaseId)
  if (!phase) return []
  const run = resolve(runDir)
  const missing = []
  for (const raw of phase.produces || []) {
    if (/[*]/.test(raw) || /\/\s*$/.test(raw)) continue // glob / 目录交别的门管
    const text = raw.replace(/（[^）]*）/g, '').trim()
    // 只认「像文件名」的条目；produce 里的『可运行代码』『布局代码』是描述，不是路径
    if (!/^[\w./-]+\.(md|json|ts|tsx|mjs)$/.test(text)) continue
    for (const rel of expandBraces(text)) {
      const candidates = [
        resolve(run, rel),
        resolve(root, '.evo/migration', rel),
        resolve(root, state_dir_of(run), rel),
      ]
      // 铺底模板不算"已落盘"：init 会把 18 份模板拷进 run，只判存在的话，
      // 一个字没写也会报"成果清单全部落盘"（本轮真实测试踩到）。
      const hit = candidates.find((f) => bytes(f) >= 60 && !isScaffoldFile(f))
      if (!hit) missing.push(rel)
    }
  }
  return missing
}

function state_dir_of(run) {
  // program run 的兄弟目录：CAPABILITIES.md 有时落在 program 根，GODS.md 落在 .evo/migration/
  return run
}

export function runPhaseChecks(runDir, phaseId, { root = process.cwd(), state } = {}) {
  const phase = phaseById(phaseId)
  if (!phase) throw new Error(`未知阶段: ${phaseId}`)
  const run = resolve(runDir)
  const results = []
  const push = (id, ok, detail) => results.push({ id, ok, detail })
  const level = state?.rLevel || 'R3'
  const gods = state?.gods || []
  const programDir = state?.programRun ? resolve(root, state.programRun) : null
  const registryText = readText(resolve(root, '.evo/migration/GODS.md'))

  for (const c of phase.checks) {
    if (!checkApplies(c, level)) continue
    const tag = `${phaseId}:${c.kind}`
    switch (c.kind) {
      // ── 基础 ──
      case 'file': {
        const p = resolve(run, c.path)
        const size = bytes(p)
        if (size > 0 && isUnfilledTemplate(p)) {
          push(`${tag}:${c.path}`, false, '仍是 init 铺的模板（顶部 TODO-init-scaffold 未删）')
          break
        }
        const ok = size >= (c.minBytes || 1)
        push(`${tag}:${c.path}`, ok, ok ? `${size}B` : `缺失或过小（${size}B < ${c.minBytes}B）`)
        break
      }
      case 'heading': {
        const hp = resolve(run, c.path)
        if (isUnfilledTemplate(hp)) {
          push(`${tag}:${c.path}:${c.text}`, false, '仍是 init 铺的模板（TODO-init-scaffold 未删）')
          break
        }
        const text = readText(hp)
        if (text === null) {
          push(`${tag}:${c.path}:${c.text}`, false, '文件不存在')
          break
        }
        const ok = text.split('\n').some((l) => l.trim().startsWith(c.text.trim()))
        push(`${tag}:${c.path}:${c.text}`, ok, ok ? '有' : `缺小节「${c.text}」`)
        break
      }
      case 'headingAny': {
        // 同一份文档允许多种合法结构（单 god 用编号小节，多 god 用「## 文件：」分节）
        const text = readText(resolve(run, c.path))
        if (text === null) {
          push(`${tag}:${c.path}`, false, '文件不存在')
          break
        }
        const ok = (c.texts || []).some((x) =>
          text.split('\n').some((l) => l.trim().startsWith(x.trim())),
        )
        push(`${tag}:${c.path}`, ok, ok ? '有' : `缺任一合法小节：${(c.texts || []).join(' 或 ')}`)
        break
      }
      case 'glob': {
        const dir = resolve(run, c.dir)
        const re = new RegExp(c.pattern)
        const files = existsSync(dir) ? readdirSync(dir).filter((f) => re.test(f)) : []
        if (!files.length) {
          push(`${tag}:${c.dir}/${c.pattern}`, false, '没有匹配文件')
          break
        }
        const small = files.filter((f) => bytes(join(dir, f)) < (c.minBytes || 1))
        push(
          `${tag}:${c.dir}/${c.pattern}`,
          small.length === 0,
          small.length ? `过小：${small.join(', ')}` : `${files.length} 个文件`,
        )
        break
      }
      case 'sectionClean': {
        const text = readText(resolve(run, c.path))
        if (text === null) {
          push(`${tag}:${c.path}`, false, '文件不存在')
          break
        }
        const body = section(text, c.section)
        if (body === null) {
          push(`${tag}:${c.path}:${c.section}`, false, `缺小节「${c.section}」`)
          break
        }
        const fails = body.split('\n').filter((l) => l.includes('\u274c') || /\bFAIL\b/.test(l))
        push(
          `${tag}:${c.path}:${c.section}`,
          fails.length === 0,
          fails.length ? `${fails.length} 项未过：${fails[0].trim().slice(0, 60)}` : '全绿',
        )
        break
      }
      // ── 指纹与登记 ──
      case 'godFingerprint': {
        if (!gods.length) {
          push(tag, false, 'state.gods 为空——先跑 state.mjs init')
          break
        }
        const bad = []
        for (const g of gods) {
          const p = resolve(root, g.path)
          if (!existsSync(p)) {
            bad.push(`${g.path} 不存在`)
            continue
          }
          const sha = sha1File(p)
          if (sha !== g.sha1) bad.push(`${basename(g.path)} sha1 变了`)
          const n = countLines(p)
          if (n !== g.lines) bad.push(`${basename(g.path)} 行数 ${g.lines}→${n}`)
        }
        push(
          tag,
          bad.length === 0,
          bad.length ? `${bad.join('；')}——回 C0 重钉` : `${gods.length} 个 god 指纹一致`,
        )
        break
      }
      case 'godRegistry': {
        if (!registryText) {
          push(tag, false, '全景表不存在：.evo/migration/GODS.md')
          break
        }
        const missing = gods.filter((g) => !godRow(registryText, g))
        const sha = sha1File(resolve(root, '.evo/migration/GODS.md'))
        const drift = state?.godRegistry?.sha1 && state.godRegistry.sha1 !== sha && !state?.closed
        const problems = []
        if (missing.length)
          problems.push(`未登记：${missing.map((g) => basename(g.path)).join(', ')}`)
        if (drift) problems.push('全景表在立项后被改动，邻居/切片结论可能过期')
        push(tag, problems.length === 0, problems.length ? problems.join('；') : '已登记且未漂移')
        break
      }
      case 'lspSource': {
        // 只认采集侧证据（symbols-*.meta.json），不认 state.json 里手填的 symbolSource。
        // 历史原因：agent 工具 code_resolve 导不出符号时，脚本曾允许人手写 "LSP" 交差，
        // 结果 TS7 环境下 175 条被当成 390 条。分母一旦是自证的，分子再准也没意义。
        const problems = []
        for (const g of gods) {
          const base = basename(g.path)
          const { path: metaPath, meta } = symbolsMetaFor(run, base)
          if (!meta) {
            problems.push(`${base} 缺采集证据 ${relative(run, metaPath) || '.meta.json'}`)
            continue
          }
          if (meta.mode !== 'tsserver')
            problems.push(
              `${base} 由 ${meta.mode} 模式导出（${meta.count} 条），不是 tsserver——分母不等于 LSP`,
            )
          if (meta.count && g.symbols && meta.count !== g.symbols)
            problems.push(`${base} state 记 ${g.symbols} 条、meta 记 ${meta.count} 条`)
          if (g.symbolSource !== 'LSP')
            problems.push(`${base} state.symbolSource=${g.symbolSource}`)
        }
        push(
          tag,
          problems.length === 0,
          problems.length
            ? problems.join('；')
            : `${gods.map((g) => `${basename(g.path)} ${g.symbols} 声明`).join('；')}（tsserver 采集，meta 一致）`,
        )
        break
      }
      case 'coverage': {
        const text = readText(resolve(run, c.path))
        if (text === null) {
          push(`${tag}:${c.path}`, false, '文件不存在')
          break
        }
        if (!gods.length) {
          push(`${tag}:${c.path}`, false, 'state.gods 为空，无法判覆盖')
          break
        }
        const res = runOwnershipCoverage(text, gods)
        for (const g of res.perGod) {
          push(
            `${tag}:${c.path}:${g.file}`,
            g.found && g.gaps.length === 0,
            !g.found
              ? '没有对应分节'
              : g.gaps.length
                ? `漏归属 ${g.gaps.length} 段：${g.gaps
                    .slice(0, 5)
                    .map(([a, b]) => `L${a}-L${b}`)
                    .join(', ')}`
                : `1-${gods.find((x) => basename(x.path) === g.file)?.lines ?? '?'} 无缝覆盖`,
          )
        }
        break
      }
      // 能力规格（spec.md）：用户故事 + 源码行区间覆盖 + 交互与导航 + 布局映射。
      // 2026-10-23 加：C-G 试点里这三样都没有，结果"31 条行为全绿"但界面与 pi-web 是两个东西。
      case 'capSpec': {
        const md = readText(resolve(run, c.path))
        if (md === null) {
          push(tag, false, '文件不存在——先按模板写能力规格')
          break
        }
        const res = checkCapSpec({ md, gods })
        push(
          tag,
          res.ok,
          res.ok
            ? `${res.totals.stories} 条用户故事、源码覆盖 ${res.totals.covered}/${res.totals.godLines} 行、${res.totals.regions} 个布局区域`
            : res.problems.join('；'),
        )
        break
      }
      // UI 原型（design/ui.md）：ASCII 主屏 + 空态/失败态 + 交互态表。
      case 'uiProto': {
        const md = readText(resolve(run, c.path ?? 'design/ui.md'))
        if (md === null) {
          push(tag, false, '文件不存在——实施前必须先有看得见的原型')
          break
        }
        const res = checkUiProto({ md })
        push(
          tag,
          res.ok,
          res.ok ? `${res.totals.blocks} 块 ASCII 原型、${res.totals.states} 个交互态` : res.problems.join('；'),
        )
        break
      }
      // 人工签字（不是"签过"，而是"人签的"）。
      // 依据：agent 代签的验收/规格等于自证清白——c.artifacts 里每个产物都必须有 by 非 agent 的签字。
      case 'humanSignoff': {
        const artifacts = c.artifacts || (c.artifact ? [c.artifact] : [])
        const problems = []
        const okList = []
        for (const a of artifacts) {
          const rec = state?.signoffs?.[a]
          if (!rec) {
            problems.push(`${a} 还没送签（需要用户看过再签）`)
            continue
          }
          if (c.requireSaw !== false && !String(rec.saw || '').trim()) {
            problems.push(`${a} 的签字没写"看的是什么"——签字必须有依据（--saw "…"）`)
            continue
          }
          if (/agent|assistant|bot|claude|gpt|codex|机器|自动/i.test(rec.by)) {
            problems.push(`${a} 由「${rec.by}」代签——这一份必须用户本人签`)
            continue
          }
          const ap = resolve(run, a)
          if (!existsSync(ap)) {
            problems.push(`${a} 不存在`)
            continue
          }
          if (sha1File(ap) !== rec.sha1) {
            problems.push(`${a} 签字后被改动，需重新送签`)
            continue
          }
          // 改签链完整性：re-auth 只能由原签字人做；换人必须先 unsign 再签（否则谁改文件谁盖章）
          if (rec.previous && rec.previous.by !== rec.by) {
            problems.push(
              `${a} 的改签链断了：上一次由「${rec.previous.by}」签，这次由「${rec.by}」签——换人要先 unsign`,
            )
            continue
          }
          okList.push(`${a}（${rec.by}）`)
        }
        push(
          tag,
          problems.length === 0,
          problems.length ? problems.join('；') : `${okList.length} 份产物已由人签字：${okList.join('、')}`,
        )
        break
      }
      case 'signoff': {
        const rec = state?.signoffs?.[c.artifact]
        if (!rec) {
          push(`${tag}:${c.artifact}`, false, '未签字——没签字不进下一阶段')
          break
        }
        const p = resolve(run, c.artifact)
        if (!existsSync(p)) {
          push(`${tag}:${c.artifact}`, false, '产物不存在')
          break
        }
        const ok = sha1File(p) === rec.sha1
        push(
          `${tag}:${c.artifact}`,
          ok,
          ok ? `${rec.by} 签于 ${rec.at}` : '签字后产物被改动——签字失效，重新送签',
        )
        break
      }
      case 'rlevel': {
        const r = state?.rLevel
        push(tag, Boolean(r), r ? `本能力 R 级 = ${r}` : '缺 R 级——先跑 state.mjs init --rlevel R2')
        break
      }
      case 'programPrereq': {
        if (!programDir) {
          push(tag, false, '未关联 program run——init 时加 --program <dir>')
          break
        }
        const missing = (c.files || []).filter((f) => !existsSync(resolve(programDir, f)))
        push(
          tag,
          missing.length === 0,
          missing.length
            ? `program run 缺：${missing.join(', ')}`
            : `${c.files.length} 个前置产物齐备`,
        )
        break
      }
      // ── Program 专有 ──
      case 'godRegistryClosed': {
        if (!registryText) {
          push(tag, false, '全景表不存在')
          break
        }
        if (!existsSync(resolve(root, 'ref_projects/pi-web'))) {
          push(tag, false, '参考仓库不可用：ref_projects/pi-web 不存在')
          break
        }
        const registered = new Set(godNames(registryText))
        const found = oversizedInRepos(root)
        const missing = found.filter((f) => !registered.has(f.name))
        push(
          tag,
          missing.length === 0,
          missing.length
            ? `${missing.length} 个 >1000 行文件未登记：${missing
                .slice(0, 4)
                .map((m) => `${m.name}(${m.lines})`)
                .join(', ')}`
            : `${found.length} 个 god 全部已登记（清单封闭）`,
        )
        break
      }
      case 'godsHaveR': {
        if (!registryText) {
          push(tag, false, '全景表不存在')
          break
        }
        const names = godNames(registryText)
        if (!names.length) {
          push(tag, false, '全景表里没有解析到任何 god 行')
          break
        }
        const bad = names.filter((n) => {
          const rows = godRows(registryText).filter((r) => r.name === n)
          return !rows.length || !rows.some((r) => r.row.some((c) => /\bR[123]\b/.test(c)))
        })
        push(
          tag,
          bad.length === 0,
          bad.length
            ? `${bad.length} 个 god 缺 R 级：${bad.slice(0, 4).join(', ')}`
            : `${names.length} 个 god 均有 R 级`,
        )
        break
      }
      case 'contracts': {
        const dir = resolve(run, c.dir)
        const want = ['wire', 'data-format', 'routes', 'i18n', 'design-system', 'interaction']
        const missing = want.filter((n) => bytes(join(dir, `${n}.md`)) < 150)
        push(
          tag,
          missing.length === 0,
          missing.length ? `缺或过小：${missing.join(', ')}` : `6 份契约齐备`,
        )
        break
      }
      case 'harness': {
        // 这里原来是关键词考勤（文件里出现 capture/assert/归一化 就算过），
        // 与技能自己反对的"门禁剧场"是同一个毛病：文件里写个词，跟两侧是否真对齐毫无关系。
        // 现在只认结构事实：registry 可解析、脚本能过语法检查、captured 的 flow 有真快照、
        // manual 的 flow 必须写明为什么不能自动（并且它会在 detail 里被点名，藏不住）。
        const dir = resolve(run, c.dir)
        if (!existsSync(dir)) {
          push(tag, false, `目录不存在：${c.dir}`)
          break
        }
        const problems = []
        const notes = []
        const regPath = join(dir, 'registry.json')
        const registry = existsSync(regPath) ? loadJson(regPath) : null
        if (!registry) {
          problems.push(
            '缺 harness/registry.json（没有它就无法知道哪些 flow 采过、哪些是人工兜底）',
          )
        }
        const flows = registry?.flows || registry?.scripts || []
        if (registry && !flows.length) problems.push('registry 里没有任何 flow')
        // flow 的标识字段历史上有 id / name 两种写法，两种都认；都没有就是格式错。
        const fid = (f) => f.id || f.name || '(未命名)'
        const unnamed = flows.filter((f) => !f.id && !f.name)
        if (unnamed.length) problems.push(`${unnamed.length} 个 flow 既没有 id 也没有 name`)
        const captured = flows.filter((f) => f.status === 'captured')
        const manual = flows.filter((f) => f.status === 'manual')
        const pending = flows.filter((f) => f.status === 'pending')
        for (const f of captured) {
          const snap = join(dir, 'snapshot', fid(f))
          if (!existsSync(snap)) {
            problems.push(`${fid(f)} 标了 captured 但没有 harness/snapshot/${fid(f)}/`)
            continue
          }
          const want = ['a11y.json', 'dom.json']
          const missing = want.filter(
            (n) => !existsSync(join(snap, n)) || bytes(join(snap, n)) < 20,
          )
          if (missing.length) problems.push(`${fid(f)} 缺快照 ${missing.join(' / ')}`)
        }
        for (const f of manual) {
          if (!f.reason || f.reason.length < 10)
            problems.push(`${fid(f)} 是 manual 但没写 reason（人工兜底必须说明为什么不能自动）`)
        }
        if (!captured.length) {
          notes.push('没有任何 captured flow——harness 尚未采到基线，行为对账只能靠人工')
        }
        if (pending.length)
          notes.push(`${pending.length} 个 flow 仍 pending：${pending.map(fid).join(', ')}`)
        // 可运行性：至少一个 harness/*.mjs 能过 node --check（不是"文件里出现 assert 这个词"）
        const scripts = readdirSync(dir, { withFileTypes: true })
          .filter((e) => e.isFile() && e.name.endsWith('.mjs'))
          .map((e) => join(dir, e.name))
        if (!scripts.length) {
          problems.push('harness/ 下没有 .mjs 脚本（采集与断言都得有可执行实现）')
        } else {
          const broken = scripts.filter((f) => {
            try {
              runNodeSyntaxCheck(f)
              return false
            } catch {
              return true
            }
          })
          if (broken.length)
            problems.push(`${broken.map((f) => basename(f)).join(', ')} 语法检查失败`)
        }
        push(
          tag,
          problems.length === 0,
          problems.length
            ? problems.join('；')
            : [notes.join('；'), `${scripts.length} 个脚本可执行`].filter(Boolean).join('；'),
        )
        break
      }
      case 'fixtures': {
        const dir = resolve(run, c.dir)
        const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.jsonl')) : []
        const ok = files.some((f) => bytes(join(dir, f)) > 100)
        push(
          tag,
          ok,
          ok ? `${files.length} 个 fixture` : '没有可用的 .jsonl fixture（双读验证需要真实样本）',
        )
        break
      }
      case 'archRules': {
        const j = loadJson(resolve(run, c.path))
        if (!j) {
          push(tag, false, `${c.path} 不存在或不是合法 JSON`)
          break
        }
        const problems = []
        if (!Array.isArray(j.layerOrder) || j.layerOrder.length < 2)
          problems.push('layerOrder 至少 2 层')
        if (!Array.isArray(j.forbiddenEdges) || !j.forbiddenEdges.length)
          problems.push('forbiddenEdges 为空')
        // mechanisms 允许两种写法：字符串数组，或 {id,label} 对象（后者可自描述）。
        // 早期版本只认数组且报错信息没说清，试运行时被写成对象直接 TypeError 崩栈。
        const mechCount = Array.isArray(j.mechanisms)
          ? j.mechanisms.length
          : j.mechanisms && typeof j.mechanisms === 'object'
            ? Object.keys(j.mechanisms).length
            : 0
        if (mechCount < 3) problems.push('mechanisms 至少 3 种（字符串数组或 {id:label} 对象均可）')
        // maxFileLines 允许数字（全局上限）或对象（按目录），两者都是合理表达
        if (!j.maxFileLines) problems.push('maxFileLines 缺失（数字或按目录的对象）')
        push(tag, problems.length === 0, problems.length ? problems.join('；') : '规则可被机器加载')
        break
      }
      case 'commMatrix': {
        const rules = loadJson(resolve(run, c.rules))
        const md = readText(resolve(run, c.table))
        if (!rules || !md) {
          push(tag, false, '缺 arch/rules.json 或 arch/communication.md')
          break
        }
        const tables = parseTables(md)
        const text = tables.flatMap((t) => t.rows.map((r) => r.join(' | ')))
        const raw = rules.mechanisms
        const mechs = (Array.isArray(raw) ? raw : Object.values(raw ?? {}))
          .map((m) => (typeof m === 'string' ? m : (m?.id ?? m?.name ?? '')))
          .filter(Boolean)
        if (!mechs.length) {
          push(tag, false, '无法解析 arch/rules.json 的 mechanisms（应为字符串数组或 {id,label}）')
          break
        }
        const missing = mechs.filter((m) => !text.some((row) => row.includes(m)))
        const hasCounter = tables.some((t) => t.header.some((h) => h.includes('反例')))
        const problems = []
        if (missing.length) problems.push(`机制未入矩阵：${missing.join(', ')}`)
        if (!hasCounter) problems.push('矩阵缺「反例」列（没有反例等于没有约束）')
        push(
          tag,
          problems.length === 0,
          problems.length ? problems.join('；') : `${mechs.length} 种机制全部入矩阵`,
        )
        break
      }
      case 'capabilityPlan': {
        const md = readText(resolve(run, 'CAPABILITIES.md'))
        if (!md || !registryText) {
          push(tag, false, '缺 CAPABILITIES.md 或全景表')
          break
        }
        const allGods = godNames(registryText)
        const seen = new Map()
        let rowsWithoutR = 0
        // 只对"引用了 god 的行"要求 R 级。早期实现对文件里**每个**表格行都要 R1/R2/R3，
        // 于是「产物清单」这类无 god 的表也被判红，逼作者为了过门硬塞 R 级注释——门在教人写假话。
        // 只统计「归属表」里的行：表头含 god / 归属 / 能力清单 才算。
        // 早期版本把正文/裁线表里出现的 god 名也算成"归属"，于是同一个文件在
        // 「能力清单」和「裁线」两处提到就被判成"重复归属"——门在惩罚解释性文字。
        for (const t of parseTables(md)) {
          const isOwnershipTable = t.header.some((h) => /god|归属|能力清单/i.test(h || ''))
          if (!isOwnershipTable) continue
          for (const row of t.rows) {
            const joined = row.join(' ')
            const named = row
              .flatMap((c) => backticked(c))
              .map((n) => basename(n))
              .filter((n) => allGods.includes(n))
            if (named.length && !/\bR[123]\b/.test(joined)) rowsWithoutR++
            for (const n of named) seen.set(n, (seen.get(n) || 0) + 1)
          }
        }
        const uncovered = allGods.filter((g) => !seen.has(g))
        const dup = [...seen.entries()].filter(([, n]) => n > 1).map(([g]) => g)
        const problems = []
        if (uncovered.length) problems.push(`未归入任何能力：${uncovered.slice(0, 4).join(', ')}`)
        if (dup.length) problems.push(`重复归属多个能力：${dup.slice(0, 4).join(', ')}`)
        if (rowsWithoutR) problems.push(`${rowsWithoutR} 行缺 R 级`)
        push(
          tag,
          problems.length === 0,
          problems.length ? problems.join('；') : `${allGods.length} 个 god 恰好归入一个能力`,
        )
        break
      }
      // ── Capability 专有 ──
      case 'denominator': {
        // 手写台账的分母声明：`> 分母：N 条…（来源 <file> sha <8位>）`
        const doc = readText(resolve(run, c.doc))
        if (doc === null) {
          push(tag, false, `${c.doc} 不存在`)
          break
        }
        const src = resolve(run, c.source)
        let actual
        if (c.countFrom === 'json') {
          const j = loadJson(src)
          actual = Array.isArray(j?.entries) ? j.entries.length : undefined
        } else {
          const prefix = (c.countFrom || 'rows:B-').replace(/^rows:/, '')
          actual = (readText(src) || '')
            .split('\n')
            .filter((l) => l.trimStart().startsWith(`| ${prefix}`)).length
        }
        if (typeof actual !== 'number') {
          push(tag, false, `无法从 ${c.source} 复算分母`)
          break
        }
        const res = checkDenominator({ text: doc, runDir: run, countActual: actual })
        push(
          tag,
          res.ok,
          res.ok
            ? `分母 ${actual} 条与来源 ${c.source} 一致（sha 已固定）${res.stale || ''}`
            : res.problems.join('；'),
        )
        break
      }
      case 'changePropagation': {
        const res = runChangePropagation(run, { requireIfDeclared: c.requireIfDeclared !== false })
        push(tag, res.ok, res.ok ? res.detail : res.problems.join('；'))
        break
      }
      case 'envReady': {
        const res = checkEnvDoc(readText(resolve(run, c.path ?? 'environment.md')))
        push(tag, res.ok, res.ok ? res.detail : res.problems.join('；'))
        break
      }
      case 'surface': {
        const j = loadJson(resolve(run, c.path))
        if (!j || !Array.isArray(j.entries)) {
          push(tag, false, `${c.path} 不存在或格式错误——先跑 enumerate-surface`)
          break
        }
        // 分母同源（P2）：条数不仅够，还要有"由命令产出"的账
        const prov = judgeProvenance(run, { kind: 'surface', count: j.entries.length })
        if (!prov.ok) {
          push(tag, false, prov.problems.join('；'))
          break
        }
        const ok = j.entries.length >= (c.min || 1)
        push(
          tag,
          ok,
          ok
            ? `${j.entries.length} 个表面点`
            : `只有 ${j.entries.length} 个表面点（要求 ≥${c.min}）`,
        )
        break
      }
      case 'contractAlign': {
        const md = readText(resolve(run, c.path))
        if (md === null) {
          push(tag, false, '文件不存在')
          break
        }
        const res = checkContractAlign(md)
        push(
          tag,
          res.ok,
          res.ok
            ? `${res.totals.rows} 行对齐均指向契约${res.totals.chg ? '（含变更单）' : ''}`
            : res.problems.join('；'),
        )
        break
      }
      case 'contractDelta': {
        const md = readText(resolve(run, c.path))
        if (md === null) {
          push(tag, false, '文件不存在')
          break
        }
        // 「无需变更单」要能过：C-G 试点确实一条契约都没改
        if (/无变更|无需变更单|不改契约|无 delta|no change/i.test(md)) {
          push(tag, true, '无契约变更')
          break
        }
        const t = parseTables(md).find((x) => columnOf(x.header, '变更单') >= 0)
        if (!t) {
          // 逐行挂单不是唯一合法形状：变更单整篇只出一张（CHG-001）也成立。
          // 早期版本只认「变更单」列，把这种写法判成红——门规定形状比契约本身还紧。
          const chg = md.match(/CHG-\d+/)
          push(
            tag,
            Boolean(chg),
            chg
              ? `差异由 ${chg[0]} 统一受理（本表无逐行变更单列）`
              : '有 delta 但既无「变更单」列也无 CHG- 编号',
          )
          break
        }
        const col = columnOf(t.header, '变更单')
        const bad = t.rows.filter((r) => !stripCell(r[col]))
        push(
          tag,
          bad.length === 0,
          bad.length ? `${bad.length} 行 delta 缺变更单号` : `${t.rows.length} 条 delta 均有变更单`,
        )
        break
      }
      case 'behaviors': {
        const md = readText(resolve(run, c.path))
        if (md === null) {
          push(tag, false, '文件不存在')
          break
        }
        const behaviors = parseBehaviors(md)
        if (!behaviors.length) {
          push(tag, false, '没有解析到任何 B- 行为行')
          break
        }
        const registry = loadJson(resolve(run, c.registry))
        const binding = runBehaviorBinding(behaviors, registry, { root })
        push(`${tag}:${binding.id}`, binding.ok, binding.detail)
        const noEvidence = behaviors.filter((b) => !/^[\w./-]+:\d+/.test(b.evidence))
        push(
          `${tag}:evidence`,
          noEvidence.length === 0,
          noEvidence.length
            ? `${noEvidence.length} 条行为缺 path:line 证据`
            : `${behaviors.length} 条行为均有证据`,
        )
        break
      }
      case 'specs': {
        const dir = resolve(run, 'specs')
        const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.md')) : []
        if (!files.length) {
          push(tag, false, `specs/ 为空（R3 必须写端到端规格）`)
          break
        }
        const problems = []
        for (const f of files) {
          const text = readFileSync(join(dir, f), 'utf8')
          for (const h of ['### 端到端链路', '### 决策表', '### 落点']) {
            if (!text.includes(h)) problems.push(`${f} 缺「${h}」`)
          }
        }
        push(
          tag,
          problems.length === 0,
          problems.length ? problems.slice(0, 4).join('；') : `${files.length} 份规格齐备`,
        )
        break
      }
      case 'frontendArch': {
        // program 级阶段（P2.5）自己就是 program run，此时 programDir 为空；
        // 早先只从 programDir 取 rules，导致程序自检时永远报"缺 frontend 对象"。
        const pdir0 = programDir || run
        const rules = loadJson(resolve(pdir0, 'arch/rules.json'))
        const r = runFrontendArch({ programDir: pdir0, rules })
        push(tag, r.ok, r.detail)
        break
      }
      case 'externalIo': {
        // god 自己可能一次 fetch 都没有（McpConfig.tsx 就是）：HTTP 藏在 import 进去的兄弟模块里。
        // 不追 import 的话 contractInventory 会看到"零命令"直接绿——分母空，永远达标。
        const god = gods[0]
        if (!god?.path) {
          push(tag, false, 'state.json 里没有 gods[0].path，无法追外部 IO')
          break
        }
        const godPath = resolve(root, god.path)
        const webRoot = resolve(godPath, '../..')
        const delta = readText(resolve(run, 'contract-delta.md')) || ''
        const wire =
          readText(resolve(run, 'contracts/wire.md')) ||
          (programDir ? readText(resolve(programDir, 'contracts/wire.md')) : null) ||
          ''
        const r = checkExternalIo({ godPath, root: webRoot, contractDelta: delta, wireText: wire })
        push(tag, r.ok, r.ok ? r.detail : r.problems.join('；'))
        break
      }
      case 'stubPlan': {
        const r = runStubPlan({ programDir: run, root })
        push(tag, r.ok, r.detail)
        break
      }
      case 'stub': {
        const surface = loadJson(resolve(run, 'surface.json'))
        const r = runStubCoverage({ programDir: programDir || run, surface, root })
        push(tag, r.ok, r.detail)
        break
      }
      case 'integration': {
        const surface = loadJson(resolve(run, 'surface.json'))
        const r = runIntegration({ capabilityDir: run, surface, root })
        push(tag, r.ok, r.detail)
        break
      }
      case 'acceptance': {
        const surface = loadJson(resolve(run, 'surface.json'))
        const r = runAcceptance({ capabilityDir: run, surface, mode: c.mode || 'pre' })
        if (r.ok) push(tag, true, r.detail)
        else {
          const need = requiredTiers({ surface, mode: c.mode || 'pre' })
          push(tag, false, `${r.detail}（需要 ${need.join('/')}）`)
        }
        break
      }
      case 'design': {
        const manifest = loadJson(resolve(run, 'design/manifest.json'))
        const behaviors = parseBehaviors(readText(resolve(run, 'behaviors.md')))
        const surface = loadJson(resolve(run, 'surface.json'))
        const rules = programDir ? loadJson(resolve(programDir, 'arch/rules.json')) : null
        const gates = runDesignGates({
          runDir: run,
          manifest,
          behaviors,
          surface,
          rules,
          level,
          root,
          // 与 design-gate.mjs 保持一致：D14 要拿 ownership 对账，D17 的规则与文档在 program run 里
          ownershipRanges: parseRanges(readText(resolve(run, 'ownership.md')) || ''),
          programDir,
        })
        for (const g of gates) push(`${tag}:${g.id}`, g.ok, g.detail)
        break
      }
      case 'quality': {
        const manifest = loadJson(resolve(run, 'design/manifest.json'))
        for (const q of runQualityBudget({ manifest, root })) push(`${tag}:${q.id}`, q.ok, q.detail)
        break
      }
      case 'drift': {
        const manifest = loadJson(resolve(run, 'design/manifest.json'))
        for (const d of runDesignDrift({ manifest, root })) push(`${tag}:${d.id}`, d.ok, d.detail)
        break
      }
      case 'parity': {
        const md = readText(resolve(run, c.path))
        if (md === null) {
          push(tag, false, '文件不存在')
          break
        }
        const behaviors = parseBehaviors(readText(resolve(run, 'behaviors.md')))
        const t = parseTables(md).find((x) => columnOf(x.header, '分类') >= 0)
        if (!t) {
          push(tag, false, '缺「差异分类」表（根本没有对账结果）')
          break
        }
        const idCol = columnOf(t.header, 'id')
        const clsCol = columnOf(t.header, '分类')
        const rows = t.rows.map((r) => ({
          id: idCol >= 0 ? stripCell(r[idCol]) : '',
          cls: stripCell(r[clsCol]),
        }))
        const resultIds = new Set(rows.map((r) => r.id).filter(Boolean))
        const missing = behaviors.filter((b) => !resultIds.has(b.id)).map((b) => b.id)
        // 分类必须落在闭集里：写「todo/未对账」等于没对账，不认
        const OK_CLS = /^(一致|差异（|blocked（|已对账)/
        const unclassified = rows.filter((r) => !OK_CLS.test(r.cls))
        const blockedNoReason = rows.filter(
          (r) => r.cls.startsWith('blocked（') && r.cls.length < 12,
        )
        const problems = []
        if (missing.length)
          problems.push(`${missing.length} 条行为无对账结果：${missing.slice(0, 4).join(', ')}`)
        if (unclassified.length)
          problems.push(
            `${unclassified.length} 条分类不在闭集（一致 / 差异（…） / blocked（原因+解除条件））：${unclassified
              .slice(0, 4)
              .map((r) => r.id || r.cls)
              .join(', ')}`,
          )
        if (blockedNoReason.length)
          problems.push(`${blockedNoReason.length} 条 blocked 没写原因与解除条件`)
        // 全 blocked 等于没对账（C-G 的教训：31 条里 18 条一条 30141 值都没取到就"完成"了）
        const blocked = rows.filter((r) => r.cls.startsWith('blocked（'))
        if (rows.length && blocked.length / rows.length > 0.5)
          problems.push(
            `${blocked.length}/${rows.length} 条是 blocked——超过一半没取到真实值，不能算对账完成（先通网络/信任，或把能力降级）`,
          )
        // 导航/布局必须有一行：pi-web 用弹窗、迁移写成路由都没被任何门发现
        if (!/导航|布局|弹窗|dialog|路由|layout/i.test(md))
          problems.push('对账表里没有导航/布局维度——交互形态不一致不会被任何门抓到')
        push(
          tag,
          problems.length === 0,
          problems.length ? problems.join('；') : `${resultIds.size} 条行为对账完成，差异全部分类`,
        )
        break
      }
      case 'retro': {
        const md = readText(resolve(run, c.path))
        if (md === null) {
          push(tag, false, '文件不存在')
          break
        }
        const t = parseTables(md).find((x) => columnOf(x.header, '落地') >= 0)
        if (!t) {
          push(tag, false, '缺「落地」列——教训没有去处')
          break
        }
        const col = columnOf(t.header, '落地')
        const bad = t.rows.filter((r) => !stripCell(r[col]) || /TODO|待定/.test(stripCell(r[col])))
        push(
          tag,
          bad.length === 0,
          bad.length ? `${bad.length} 条教训没有落地位置` : `${t.rows.length} 条教训均有落地位置`,
        )
        break
      }
      case 'godStatus': {
        if (!registryText) {
          push(tag, false, '全景表不存在')
          break
        }
        const problems = []
        for (const g of gods) {
          const row = godRow(registryText, g)
          if (!row) problems.push(`${basename(g.path)} 未登记`)
          else if (!row.includes(c.status))
            problems.push(`${basename(g.path)} 状态未更新为「${c.status}」`)
        }
        push(
          tag,
          problems.length === 0,
          problems.length ? problems.join('；') : `已标记${c.status}`,
        )
        break
      }
      case 'decisionsClosed': {
        const open = (state?.decisions || []).filter((d) => d.status === 'open')
        if (!open.length) {
          push(tag, true, '无未决项')
          break
        }
        const text = readText(resolve(run, c.path)) || ''
        const unmoved = open.filter((d) => !text.includes(d.id))
        push(
          tag,
          unmoved.length === 0,
          unmoved.length
            ? `未决项未移交：${unmoved.map((d) => d.id).join(', ')}`
            : `未决项已移交：${open.map((d) => d.id).join(', ')}`,
        )
        break
      }
      case 'ownershipTypes': {
        const text = readText(resolve(run, c.path))
        if (text === null) {
          push(`${tag}:${c.path}`, false, '文件不存在')
          break
        }
        const res = runOwnershipTypes(text)
        push(
          `${tag}:${c.path}`,
          res.ok,
          res.ok ? `${res.total} 个区间类型合法` : res.problems.slice(0, 4).join('；'),
        )
        break
      }
      case 'symbols': {
        const mapText = readText(resolve(run, 'symbol-map.md'))
        if (mapText === null) {
          push(tag, false, '缺 symbol-map.md——符号级对账无法进行')
          break
        }
        if (!gods.length) {
          push(tag, false, 'state.gods 为空')
          break
        }
        for (const g of gods) {
          const base = basename(g.path)
          const symText = readOrNull(symbolsFileFor(run, base))
          if (symText === null) {
            push(
              `${tag}:${base}`,
              false,
              `缺 evidence/symbols-${base.replace(/\.(tsx?|mjs)$/, '')}.md`,
            )
            continue
          }
          const res = runSymbolParity({ symbolsText: symText, mapText, root })
          push(
            `${tag}:${base}`,
            res.ok,
            res.ok
              ? `${res.totals.symbols} 个符号全部对账（遗漏/过期/虚报 均为 0）`
              : res.problems.join('；'),
          )
        }
        break
      }
      case 'wireTable': {
        const md = readText(resolve(run, 'contracts/wire.md'))
        if (md === null) {
          push(tag, false, '缺 contracts/wire.md')
          break
        }
        const tables = parseTables(md)
        // 表头列顺序不固定（有的把「证据」放第一列），只要任一列标题命中即可；
        // 早期版本只查 header[0]，模板一改列序就误报，属于门比契约更脆。
        const hasCmd = tables.some(
          (x) => x.header.some((h) => /命令/.test(h || '')) && x.rows.length,
        )
        const hasEvt = tables.some(
          (x) => x.header.some((h) => /事件/.test(h || '')) && x.rows.length,
        )
        const problems = []
        if (!hasCmd) problems.push('「命令」表为空')
        if (!hasEvt) problems.push('「事件」表为空')
        push(tag, problems.length === 0, problems.length ? problems.join('；') : '命令/事件表非空')
        break
      }
      case 'contractInventory': {
        const surface = loadJson(resolve(run, 'surface.json'))
        const wireText = programDir ? readText(resolve(programDir, 'contracts/wire.md')) : null
        if (!surface) {
          push(tag, false, '缺 surface.json——契约覆盖没有分母')
          break
        }
        if (wireText === null) {
          push(tag, false, '纲领 run 缺 contracts/wire.md')
          break
        }
        const res = checkContractInventory({ surface, wireText })
        push(
          tag,
          res.ok,
          res.ok
            ? res.totals.nothingToCheck
              ? '本能力无命令/事件表面点（无可对账项）'
              : `命令 ${res.totals.sourceCommands} / 事件 ${res.totals.sourceEvents} 全部在契约里`
            : res.problems.join('；'),
        )
        break
      }
      case 'specTests': {
        const dirs = c.tests || ['packages/core/src', 'packages/web/src', 'e2e']
        const results = runSpecGates({ runDir: run, root, testDirs: dirs })
        for (const r of results) push(`${tag}:${r.id}`, r.ok, r.detail)
        break
      }
      case 'behaviorScripts': {
        const registry = loadJson(resolve(run, 'harness/registry.json'))
        if (!registry || !Array.isArray(registry.scripts) || !registry.scripts.length) {
          push(tag, false, '缺 harness/registry.json 或脚本清单为空')
          break
        }
        const missing = registry.scripts
          .filter((s) => s.file)
          .filter((s) => !existsSync(resolve(root, s.file)))
          .map((s) => `${s.id}(${s.file})`)
        const noFile = registry.scripts.filter((s) => !s.file).map((s) => s.id)
        const problems = []
        if (missing.length)
          problems.push(`${missing.length} 个脚本文件不存在：${missing.slice(0, 4).join(', ')}`)
        if (noFile.length)
          problems.push(`${noFile.length} 个脚本没有 file 字段：${noFile.slice(0, 4).join(', ')}`)
        push(
          tag,
          problems.length === 0,
          problems.length ? problems.join('；') : `${registry.scripts.length} 个脚本文件都存在`,
        )
        break
      }
      case 'programAudit': {
        if (!registryText) {
          push(tag, false, '全景表不存在')
          break
        }
        const rows = godRows(registryText)
        const notDone = rows.filter((r) => !r.row.some((c) => c.includes('已完成')))
        const caps = readText(resolve(programDir || run, 'CAPABILITIES.md'))
        const problems = []
        if (notDone.length)
          problems.push(
            `${notDone.length} 个 god 未标记已完成：${notDone
              .slice(0, 4)
              .map((r) => r.name)
              .join(', ')}`,
          )
        if (caps === null) problems.push('缺 CAPABILITIES.md，无法核对能力状态')
        else {
          const open = parseTables(caps)
            .flatMap((x) => x.rows)
            .filter((row) => row.some((c) => /待开始|进行中/.test(c)))
            .map((row) => stripCell(row[0]))
          if (open.length)
            problems.push(`${open.length} 个能力仍未完成：${open.slice(0, 4).join(', ')}`)
        }
        push(
          tag,
          problems.length === 0,
          problems.length ? problems.join('；') : `${rows.length} 个 god 与全部能力均已完成`,
        )
        break
      }
      case 'verification': {
        const id = c.id || phaseId
        const res = judgeVerification(run, id, c.maxAgeDays ? { maxAgeDays: c.maxAgeDays } : {})
        push(
          `${tag}:${id}`,
          res.ok,
          res.ok
            ? `${res.runs.length} 条命令最近一次全部 exit 0（${Math.floor(res.ageDays)} 天前）`
            : res.problems.join('；'),
        )
        break
      }
      case 'plan': {
        const dir = resolve(run, 'plans')
        const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.md')) : []
        if (!files.length) {
          push(tag, false, '缺 plans/*.md——先用 writing-plans 产出任务级计划')
          break
        }
        const problems = []
        for (const f of files) {
          const md = readFileSync(join(dir, f), 'utf8')
          const t = parseTables(md).find((x) => columnOf(x.header, '任务') >= 0)
          if (!t) {
            problems.push(
              `${f} 没有任务表（需要「任务 / 设计元素 / 行为 / 验收命令 / 测试 ID」列）`,
            )
            continue
          }
          if (!t.rows.length) problems.push(`${f} 任务表为空`)
        }
        push(
          tag,
          problems.length === 0,
          problems.length ? problems.join('；') : `${files.length} 份计划有任务表`,
        )
        break
      }
      case 'trace': {
        const manifest = loadJson(resolve(run, 'design/manifest.json'))
        const behaviors = parseBehaviors(readText(resolve(run, 'behaviors.md')))
        const dirs = c.tests || ['packages/core/src', 'packages/web/src', 'e2e']
        const res = runTrace({ runDir: run, manifest, behaviors, root, testDirs: dirs })
        push(
          tag,
          res.ok,
          res.ok
            ? `四向闭合：${res.totals.behaviors} 行为 × ${res.totals.design} 设计 × ${res.totals.tasks} 任务 × ${res.totals.tests} 测试`
            : res.problems.slice(0, 4).join('；'),
        )
        break
      }
      case 'review': {
        const md = readText(resolve(run, 'review.md'))
        if (md === null) {
          push(tag, false, '缺 review.md——能力结束前必须按 12 项清单做一次代码审查')
          break
        }
        // 度量对象 = manifest 里所有落点文件（设计说住哪，就量哪）
        const manifest = loadJson(resolve(run, 'design/manifest.json'))
        const limits = c.limits || undefined
        const files = [
          ...new Set(
            [
              ...(manifest?.elements ?? []).map((e) => e.landing ?? e.file),
              ...(manifest?.components ?? []).map((e) => e.file),
              ...(manifest?.hooks ?? []).map((e) => e.file),
              ...(manifest?.stores ?? []).map((e) => e.file),
            ].filter(Boolean),
          ),
        ]
        const findings = measureFiles({ root, files, limits: { ...limits } })
        const res = checkReview({ md, findings })
        push(
          tag,
          res.ok,
          res.ok
            ? `${res.totals.rows} 项清单闭合（fix ${res.totals.fix} 项；度量 ${findings.length} 个文件有超限项且都已登记）`
            : res.problems.slice(0, 4).join('；'),
        )
        break
      }
      case 'conventions': {
        // 规则住在 program run（能力 run 不重复一份），program 级阶段自己就是 program run
        const pdir = programDir || run
        const conv = loadJson(resolve(pdir, 'arch/conventions.json'))
        const rules = loadJson(resolve(pdir, 'arch/rules.json'))
        const arch = readIfExists(resolve(pdir, 'ARCHITECTURE.md')) ?? ''
        const res = checkConventions({
          conventions: conv,
          archText: arch,
          layerPaths: rules?.layerPaths ?? null,
          maxAgeDays: c.maxAgeDays ?? 30,
        })
        push(tag, res.ok, res.ok ? res.detail : res.problems.slice(0, 4).join('；'))
        break
      }
      case 'placement': {
        const manifest = loadJson(resolve(run, 'design/manifest.json'))
        if (!manifest) {
          push(tag, false, '缺 design/manifest.json——落点判据要求先有设计元素')
          break
        }
        const pdir = programDir || run
        const rules = loadJson(resolve(pdir, 'arch/rules.json'))
        const res = checkPlacement({
          elements: manifest.elements ?? [],
          root,
          layerPaths: rules?.layerPaths ?? null,
          mode: c.mode || 'plan',
        })
        push(tag, res.ok, res.ok ? res.detail : res.problems.slice(0, 4).join('；'))
        break
      }
      case 'fidelity': {
        // P7 保真门：数据面 parity 管不到"页面少了半个"，所以要求 pi-web 独有的可及元素
        // 必须在 parity.md 里出现过——"没对齐"可以，"没提过"不行。
        const parityText = readIfExists(resolve(run, c.doc || 'parity.md')) ?? ''
        const res = checkFidelity({
          runDir: run,
          docText: parityText,
          minCoverage: c.minCoverage ?? 0.7,
        })
        push(tag, res.ok, res.detail)
        break
      }
      case 'webScaffold': {
        // 落点门（C 项）：web 工程必须声明切片契约，组件只能住在 features/<slice>/ 等允许的根下。
        // 边界/预算交给仓库自己的 check-boundaries.mjs——两份规则必然漂移，这里只判"骨架与落点"。
        const pdir = programDir || run
        const rules = loadJson(resolve(pdir, 'arch/rules.json'))
        if (!rules) {
          push(tag, false, `缺 ${relative(root, resolve(pdir, 'arch/rules.json'))}——没有 rules 就没有 web 契约`)
          break
        }
        for (const r of runWebScaffold({ root, rules })) push(`${tag}:${r.id}`, r.ok, r.detail)
        break
      }
      case 'lines': {
        let state
        try {
          state = readState(run)
        } catch (e) {
          push(tag, false, e.message)
          break
        }
        const res = runLineCoverage({
          md: readIfExists(resolve(run, 'ownership.md')),
          gods: state.gods || [],
          manifest: loadJson(resolve(run, 'design/manifest.json')),
          cutListText: readIfExists(resolve(run, 'cut-list.md')),
          root,
          mode: c.mode || 'structure',
        })
        push(
          tag,
          res.ok,
          res.ok
            ? `${res.totals.lines} 行 / ${res.totals.ranges} 个区间闭合`
            : res.problems.slice(0, 4).join('；'),
        )
        break
      }
      case 'volume': {
        const res = runVolume(run, c.prose || c.data ? { prose: c.prose, data: c.data } : undefined)
        push(
          tag,
          res.ok,
          res.ok ? `${res.rows.length} 个工件体量合规` : res.problems.slice(0, 3).join('；'),
        )
        break
      }
      default:
        push(`${tag}:unknown`, false, `未知检查类型 ${c.kind}`)
    }
  }

  const missing = producesMissing(run, phaseId, { root })
  push(
    `${phaseId}:produces`,
    missing.length === 0,
    missing.length
      ? `produces 里 ${missing.length} 项没有落盘：${missing.slice(0, 4).join(', ')}`
      : '成果清单全部落盘',
  )

  return { phase: phaseId, scope: phase.scope, ok: results.every((r) => r.ok), results }
}

export function formatReport(report) {
  return report.results.map((r) => `${r.ok ? GREEN(r.detail) : RED(r.detail)}  ${r.id}`).join('\n')
}
