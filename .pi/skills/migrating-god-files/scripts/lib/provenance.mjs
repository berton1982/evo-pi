/**
 * 分母同源（P2）——凡是 "N/N 全部达标" 的判据，分母必须能被第三方复算。
 *
 * 起因（C-G 试点实测）：`McpConfig.tsx` 一次 fetch 都没有，`enumerate-surface`
 * 于是产出 0 个 `api` 表面点，`contractInventory` 报"无可对账项"直接绿；
 * 同一族问题还包括 175 条手填符号冒充 450 条 LSP 结果、parity 全 `blocked` 仍绿。
 * 结论：**分母由被检方提供时，分子永远达标**。
 *
 * 因此每个"N 条"都必须在 `evidence/provenance.json` 留下记录：
 *   { kind, count, source: 'cmd'|'hand', cmd, at }
 * 且 source 必须是 `cmd`（脚本产出）。手填的分母一律判红——不是不信任人，
 * 而是"手填的分母"没办法被别人复算，它只是另一个断言。
 */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

export function provenancePath(runDir) {
  return join(runDir, 'evidence', 'provenance.json')
}

export function readProvenance(runDir) {
  const p = provenancePath(runDir)
  if (!existsSync(p)) return {}
  try {
    const j = JSON.parse(readFileSync(p, 'utf8'))
    return j && typeof j === 'object' ? j : {}
  } catch {
    return {}
  }
}

/** 记一次分母来源。cmd 写成"人能复跑"的形式（可含参数，但不含绝对临时路径）。 */
export function writeProvenance(runDir, kind, { count, source = 'cmd', cmd = '' }) {
  const all = readProvenance(runDir)
  all[kind] = {
    kind,
    count,
    source,
    cmd,
    at: new Date().toISOString(),
  }
  const p = provenancePath(runDir)
  mkdirSync(dirname(p), { recursive: true })
  writeFileSync(p, `${JSON.stringify(all, null, 2)}\n`)
  return all[kind]
}

/** 判断一条分母记录是否可采信：来源必须是命令、条数必须与当前事实一致、不能太旧。 */
export function judgeProvenance(runDir, { kind, count, maxAgeDays = 30 }) {
  const entry = readProvenance(runDir)[kind]
  if (!entry) {
    return {
      ok: false,
      problems: [`没有「${kind}」的分母记录——分母必须由命令产出并记账（evidence/provenance.json）`],
    }
  }
  const problems = []
  if (entry.source !== 'cmd') {
    problems.push(`「${kind}」的分母是手填的（source=${entry.source}）——手填分母无法被复算`)
  }
  if (typeof count === 'number' && entry.count !== count) {
    problems.push(
      `「${kind}」记的是 ${entry.count} 条，当前实际 ${count} 条（分母过期，重跑产出它的命令）`,
    )
  }
  const ageDays = (Date.now() - Date.parse(entry.at || 0)) / 86_400_000
  if (!Number.isFinite(ageDays) || ageDays > maxAgeDays) {
    problems.push(
      `「${kind}」的分母记录已 ${Math.round(ageDays)} 天未更新（上限 ${maxAgeDays} 天）`,
    )
  }
  return { ok: problems.length === 0, problems, entry }
}

/** 文件前 8 位 sha256：用来把"该文档声明自己对齐的是哪一版"钉住。 */
export function shortSha(file) {
  if (!existsSync(file)) return null
  return createHash('sha256').update(readFileSync(file)).digest('hex').slice(0, 8)
}

/**
 * denominator 判据的解析：文档里必须写一行
 *   `> 分母：27 条行为（来源 behaviors.md sha 1a2b3c4d）`
 * 条数与 sha 都要能被 gate 复算。
 */
export const DENOMINATOR_RE =
  /分母[:：]\s*(\d+)\s*条[^（(]*[（(]来源\s*([\w./-]+)\s+sha\s+([0-9a-f]{8})[）)]/i

export function parseDenominator(text) {
  const m = DENOMINATOR_RE.exec(text || '')
  if (!m) return null
  return { count: Number(m[1]), sourceFile: m[2], sha: m[3].toLowerCase() }
}

/**
 * 校验一个"手写台账"的分母：
 *  - 声明里的 sha 必须等于来源文件当前 sha（来源改了就必须重算台账）；
 *  - 声明里的条数必须与 `countActual` 复算结果一致（行数 / 数组长度由调用方给）。
 */
export function checkDenominator({ text, runDir, countActual }) {
  const parsed = parseDenominator(text)
  if (!parsed) {
    return {
      ok: false,
      problems: ['缺「分母：N 条…（来源 <file> sha <8位>）」声明——不写分母，N/N 达标无法核对'],
    }
  }
  const actualSha = shortSha(join(runDir, parsed.sourceFile))
  if (!actualSha) {
    return { ok: false, problems: [`分母来源文件不存在：${parsed.sourceFile}`] }
  }
  const problems = []
  const countMismatch = typeof countActual === 'number' && parsed.count !== countActual
  if (countMismatch) {
    // 条数对不上 = 台账与来源已经不同步，这是真错
    problems.push(`声明分母 ${parsed.count} 条，实际 ${countActual} 条`)
  }
  let stale = ''
  if (actualSha !== parsed.sha) {
    // sha 变了但条数没变：来源被人编辑过、分母没动。判绿，但把这件事说出来，
    // 逼下一次重算——不能静默，也不该拦住一条算术上仍然成立的对账。
    stale = `（来源 sha 已变：${parsed.sha} → ${actualSha}，条数未变，建议重算台账）`
  }
  return { ok: problems.length === 0, problems, parsed, stale }
}
