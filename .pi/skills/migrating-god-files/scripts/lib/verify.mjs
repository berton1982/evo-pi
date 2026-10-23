// 机器产生的验证证据 —— 把"人手写 ✅"换成"命令真的跑过"。
//
// 为什么必须：上一代技能的门读的是人写的 markdown。人写 `- ✅ 单测绿` 就过，
// 等于没有验证。这里把门的输入换成 `gates/<id>.json`：
//   { generatedAt, runs: [{ cmd, exit, durationMs, at, tail }] }
// 门只认这份 JSON：必须有 ≥1 次运行、全部 exit 0、且未过期（默认 30 天）。
//
// 命令来源：`plans/<cap>.md` 的验收列（仓内受控文本），或人显式传 --cmd。
// 不做沙箱：这是开发者的仓库，命令等价于他自己在终端里敲。

import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

export const DEFAULT_MAX_AGE_DAYS = 30

export function verificationPath(runDir, id) {
  return resolve(runDir, 'gates', `${id}.json`)
}

// ANSI 转义序列用构造式正则：字面控制字符会触发 noControlCharactersInRegex。
const ANSI = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g')

function tailOf(text, lines = 20) {
  const clean = String(text || '').replace(ANSI, '')
  return clean.split('\n').slice(-lines).join('\n').trim()
}

/** 跑一组命令并写 gates/<id>.json；任一条非 0 也照样记录（证据要真实） */
export function recordVerification({ runDir, id, commands, root = '.', timeoutMs = 600000 }) {
  const runs = []
  for (const cmd of commands) {
    const started = Date.now()
    let exit = 0
    let out = ''
    try {
      out = execSync(cmd, {
        cwd: resolve(root),
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: timeoutMs,
      })
    } catch (e) {
      exit = e.status ?? 1
      out = `${e.stdout || ''}${e.stderr || ''}`
    }
    runs.push({
      cmd,
      exit,
      durationMs: Date.now() - started,
      at: new Date().toISOString(),
      tail: tailOf(out),
    })
  }
  const p = verificationPath(runDir, id)
  mkdirSync(dirname(p), { recursive: true })
  const payload = { id, generatedAt: new Date().toISOString(), runs }
  writeFileSync(p, `${JSON.stringify(payload, null, 2)}\n`)
  return payload
}

/** 判一份验证证据是否可用；返回 {ok, problems, runs} */
export function judgeVerification(runDir, id, { maxAgeDays = DEFAULT_MAX_AGE_DAYS } = {}) {
  const p = verificationPath(runDir, id)
  if (!existsSync(p))
    return { ok: false, problems: [`缺 gates/${id}.json——先跑 record-verification.mjs`], runs: [] }
  let j
  try {
    j = JSON.parse(readFileSync(p, 'utf8'))
  } catch {
    return { ok: false, problems: [`gates/${id}.json 不是合法 JSON`], runs: [] }
  }
  const runs = Array.isArray(j.runs) ? j.runs : []
  const problems = []
  if (!runs.length) problems.push('没有任何命令运行记录')
  const failed = runs.filter((r) => r.exit !== 0)
  if (failed.length)
    problems.push(
      `${failed.length} 条命令非 0 退出：${failed
        .map((r) => r.cmd)
        .slice(0, 3)
        .join(' / ')}`,
    )
  const ageDays = j.generatedAt
    ? (Date.now() - new Date(j.generatedAt).getTime()) / 86400000
    : Infinity
  if (ageDays > maxAgeDays)
    problems.push(`证据已过期（${Math.floor(ageDays)} 天 > ${maxAgeDays} 天）——重跑`)
  return { ok: problems.length === 0, problems, runs, ageDays }
}
