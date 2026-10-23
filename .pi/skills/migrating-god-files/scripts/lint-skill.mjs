#!/usr/bin/env node
// 技能自检——把 v1 教训变成可执行规则。
//
// 为什么需要它：v1 把「实测证据文档」写成链接指向一个运行期产物，
// 产物删掉后技能仍然引用它；同时 `lsp-first.md` 合并后仍有 2 处旧链接。
// 这类缺陷不该靠 review 发现，应该被脚本挡在交付前。
//
// 用法: node lint-skill.mjs [--skill-dir <dir>]
// 退出码: 0 = 通过（可有 warning）；1 = 有 error；2 = 用法错误

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, dirname, join, relative, resolve } from 'node:path'
import { PHASES } from './lib/phases.mjs'

const argv = process.argv.slice(2)
const known = new Set(['--skill-dir', '--help', '-h'])
for (const a of argv) {
  if (a.startsWith('-') && !known.has(a)) {
    console.error(`\u274c 未知参数: ${a}`)
    process.exit(2)
  }
}
const skillDir = resolve(
  argv.indexOf('--skill-dir') >= 0
    ? argv[argv.indexOf('--skill-dir') + 1]
    : resolve(import.meta.dirname, '..'),
)

const errors = []
const warnings = []
const err = (m) => errors.push(m)
const warn = (m) => warnings.push(m)

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e)
    if (statSync(p).isDirectory()) {
      if (e === 'node_modules') continue
      walk(p, out)
    } else out.push(p)
  }
  return out
}

const files = walk(skillDir)
const mdFiles = files.filter((f) => f.endsWith('.md'))
const mjsFiles = files.filter((f) => f.endsWith('.mjs'))

// 1) frontmatter
const skillMd = resolve(skillDir, 'SKILL.md')
if (!existsSync(skillMd)) {
  err('缺 SKILL.md——技能入口不存在')
} else {
  const text = readFileSync(skillMd, 'utf8')
  const m = text.match(/^---\n([\s\S]*?)\n---\n/)
  if (!m) err('SKILL.md 缺 YAML frontmatter')
  else {
    const fm = m[1]
    if (fm.length > 1024) err(`frontmatter ${fm.length} 字符 > 1024`)
    const name = (fm.match(/^name:\s*(.+)$/m) || [])[1]
    const desc = (fm.match(/^description:\s*([\s\S]*?)(?=\n[a-z-]+:|\n*$)/m) || [])[1]
    if (!name) err('frontmatter 缺 name')
    else if (name.trim() !== basename(skillDir))
      err(`name(${name.trim()}) 与目录名(${basename(skillDir)}) 不一致`)
    if (!desc) err('frontmatter 缺 description')
    else if (!/^\s*Use when/.test(desc))
      err('description 必须以 "Use when" 开头（只写触发条件，不写流程摘要）')
  }
  // 2) 入口体积预算：入口只做分诊与派发，细节下沉 references/
  const chars = text.length
  if (chars > 6000) err(`SKILL.md ${chars} 字符 > 6000——入口在变胖，把细节下沉到 references/`)
  if (/待填|TODO|TBD|FIXME/.test(text)) err('SKILL.md 含占位符（待填/TODO/TBD/FIXME）')
}

// 3) ★ 不得引用运行期产物：技能是长期资产，run 目录是执行期状态
for (const f of mdFiles) {
  const text = readFileSync(f, 'utf8')
  const rel = relative(skillDir, f)
  for (const m of text.matchAll(/\.evo\/migration\/([A-Za-z0-9][-\w]*)/g)) {
    // `.evo/migration/GODS.md` 这类是结构文件（长期存在），不是运行期 run 目录。
    if (text[m.index + m[0].length] === '.') continue
    if (/^\d{6,8}-/.test(m[1])) {
      err(`${rel}: 引用了具体 run 目录「${m[1]}」——技能里只允许 \`.evo/migration/<run>/\` 占位形式`)
    } else {
      warn(`${rel}: 「.evo/migration/${m[1]}」看起来像 run 目录——确认它是占位而非某次运行`)
    }
  }
  for (const m of text.matchAll(/(SIMULATION-FINDINGS|evidence\/symbols-[a-z])/g)) {
    warn(`${rel}: 出现运行期证据文件名「${m[1]}」——确认它不是"未来才会生成"的产物`)
  }
}

// 4) 相对链接必须可解析
for (const f of mdFiles) {
  const text = readFileSync(f, 'utf8')
  const dir = dirname(f)
  for (const m of text.matchAll(/\]\(([^)\s#]+)(#[^)]*)?\)/g)) {
    const target = m[1]
    if (/^(https?:|mailto:)/.test(target)) continue
    if (!existsSync(resolve(dir, target))) {
      err(`${relative(skillDir, f)}: 死链 → ${target}`)
    }
  }
}

// 5) 文档与阶段契约一致（v1 的核心缺陷：文档说 6+8，脚本是 7+9）
const workflow = resolve(skillDir, 'references/workflow.md')
if (existsSync(workflow)) {
  const text = readFileSync(workflow, 'utf8')
  for (const p of PHASES) {
    if (!new RegExp(`^##+\\s*${p.id}\\b`, 'm').test(text)) {
      err(`references/workflow.md 缺阶段小节「${p.id} ${p.name}」——文档与 lib/phases.mjs 不一致`)
    }
    for (const sub of p.substeps) {
      if (!text.includes(sub.id)) err(`references/workflow.md 缺子步骤 ${sub.id}`)
    }
  }
} else {
  err('缺 references/workflow.md——阶段说明的宿主文件不存在')
}

// 6) references 下的文件都应被索引进 SKILL.md（发现性）
if (existsSync(skillMd)) {
  const index = readFileSync(skillMd, 'utf8')
  for (const f of mdFiles) {
    const rel = relative(skillDir, f)
    if (rel === 'SKILL.md') continue
    if (!index.includes(rel) && !rel.startsWith('references/templates/')) {
      err(`SKILL.md 未索引 ${rel}——未来的 agent 找不到它（references 必须有入口）`)
    }
  }
}

// 7) 工件三件套不许有孤儿：references 文档 / templates 模板 / scripts 脚本
//    为什么：孤儿文件等于"写了但没人会读到"。上一轮就出现过 6 个模板没有任何文档提到，
//    agent 只能照门猜标题；3 个 lib 模块也没在 tooling.md 的单一事实来源里出现。
const refDir = resolve(skillDir, 'references')
const tplDir = resolve(refDir, 'templates')
const scriptDir = resolve(skillDir, 'scripts')
const toolingPath = resolve(refDir, 'tooling.md')
const toolingText = existsSync(toolingPath) ? readFileSync(toolingPath, 'utf8') : ''
const docTexts = mdFiles
  .filter((f) => !f.startsWith(tplDir))
  .map((f) => ({ rel: relative(skillDir, f), text: readFileSync(f, 'utf8') }))
if (!toolingText) err('缺 references/tooling.md——脚本清单的宿主文件不存在')

if (existsSync(tplDir)) {
  const tplSrc = existsSync(resolve(scriptDir, 'lib/templates.mjs'))
    ? readFileSync(resolve(scriptDir, 'lib/templates.mjs'), 'utf8')
    : ''
  for (const f of readdirSync(tplDir)) {
    if (!/^[\w.-]+\.(md|json)$/.test(f)) {
      err(`references/templates/${f}: 文件名不合规（只允许 [A-Za-z0-9_.-] + .md/.json）`)
      continue
    }
    const citedBy = docTexts.filter((d) => d.text.includes(f)).map((d) => d.rel)
    if (!citedBy.length) {
      err(`references/templates/${f}: 没有任何文档引用它——模板写了却没人会看到`)
    }
    if (!tplSrc.includes(`'${f}'`)) {
      err(
        `references/templates/${f}: 不在 lib/templates.mjs 的 TEMPLATE_BY_PHASE 里——init 不会铺它`,
      )
    }
  }
}

if (existsSync(scriptDir)) {
  for (const f of readdirSync(scriptDir)) {
    if (!f.endsWith('.mjs')) continue
    if (!toolingText.includes(f)) err(`scripts/${f}: tooling.md 的脚本清单里没有它——孤儿脚本`)
  }
  const libDir = resolve(scriptDir, 'lib')
  if (existsSync(libDir)) {
    for (const f of readdirSync(libDir)) {
      if (!f.endsWith('.mjs')) continue
      if (!toolingText.includes(f)) err(`scripts/lib/${f}: tooling.md 的单一事实来源里没有它`)
    }
  }
}

// 7.5) 模板必须是"标准模板"：能一眼看出铺到哪、由哪个门检查
//      历史上出现过 components.md 只写「实施图纸」不写目标路径、PROGRAM.md 写「复制到…」
//      但现在是 init 铺底——两种都会让 agent 把模板当参考文档而不是落地文件。
for (const f of readdirSync(tplDir)) {
  const p = resolve(tplDir, f)
  const text = readFileSync(p, 'utf8')
  if (f.endsWith('.json')) {
    try {
      const j = JSON.parse(text)
      if (!Object.keys(j).some((k) => k.startsWith('//'))) {
        err(`references/templates/${f}: 缺 "//" 说明键——JSON 模板必须自带字段说明`)
      }
    } catch {
      err(`references/templates/${f}: 不是合法 JSON`)
    }
    continue
  }
  const lines = text.split('\n')
  if (!/^# \S/.test(lines[0])) err(`references/templates/${f}: 第一行必须是一级标题`)
  if (!/— `[^`]+`/.test(lines[0])) {
    err(`references/templates/${f}: 标题缺目标路径（形如 "— \`<run>/x.md\`"）`)
  }
  const head = lines.slice(0, 12).join('\n')
  if (!/(门|判据|\bD\d{1,2}\b|check-phase|state\.mjs)/.test(head)) {
    err(`references/templates/${f}: 开头没写哪个门检查它——照着填的人不知道判据`)
  }
}

// 7.6) 文档里提到的 scripts/xxx.mjs 必须真实存在（死引用比死链更难发现：
//      `node scripts/verify-features.mjs` 这种行不会被 markdown 链接检查覆盖）
for (const { rel, text } of docTexts) {
  for (const m of text.matchAll(/(?:^|[\s`(])(scripts\/[\w./-]+\.mjs)/g)) {
    const target = resolve(skillDir, m[1])
    if (!existsSync(target)) err(`${rel}: 引用了不存在的脚本 ${m[1]}`)
  }
}

// 8) 脚本不得引入外部依赖（技能要零安装可跑）
//    只认行首的 import 语句：fixture 里的字符串（如生成 zod 契约样例）不算依赖。
for (const f of mjsFiles) {
  const text = readFileSync(f, 'utf8')
  for (const line of text.split('\n')) {
    if (!/^\s*import\b/.test(line) && !/^\s*export\b.*\bfrom\b/.test(line)) continue
    const m = line.match(/from\s+'([^']+)'/)
    if (!m) continue
    const spec = m[1]
    if (spec.startsWith('.') || spec.startsWith('node:')) continue
    err(`${relative(skillDir, f)}: 引入外部依赖「${spec}」——技能脚本只允许 node 内置模块`)
  }
}

for (const w of warnings) console.log(`\u26a0 ${w}`)
for (const e of errors) console.log(`\u274c ${e}`)
console.log(
  `\n${errors.length ? `\u274c ${errors.length} 个错误` : '\u2705 自检通过'}${warnings.length ? ` · ${warnings.length} 个提示` : ''}`,
)
process.exit(errors.length ? 1 : 0)
