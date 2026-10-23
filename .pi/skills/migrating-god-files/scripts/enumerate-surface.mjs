#!/usr/bin/env node
// 表面枚举——给「行为覆盖率」一个**外部分母**。
//
// 为什么必须有它：行为清单是人写的，自己声明自己 = 覆盖率自证。
// 这里从**参考实现源码**枚举可交互表面（handler / 命令 / 事件 / URL 参数 /
// i18n key / 热键 / aria / role），每个表面点一个稳定 ID。
// 之后 design-gate 的 D2 要求「每个表面点都有归属」，于是"少写几条行为"不再能刷满覆盖率。
//
// ID 的稳定性：由 file + kind + 归一化文本 的哈希生成，**与行号无关**——
// 源码上下移动不会让已有归属失效，只有内容变了才会。
//
// 用法:
//   node enumerate-surface.mjs --run <dir> [--src ref_projects/pi-web] [--root .]
//   node enumerate-surface.mjs --run <dir> --check      # 与上次枚举比对，报新增/消失
// 退出码: 0 = 成功；1 = --check 发现漂移；2 = 用法错误

import { fileURLToPath } from 'node:url'
import { writeProvenance } from './lib/provenance.mjs'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { basename, join, relative, resolve } from 'node:path'

const argv = process.argv.slice(2)
const known = new Set([
  '--run',
  '--root',
  '--src',
  '--check',
  '--allow-drift',
  '--json',
  '--help',
  '-h',
])
for (let i = 0; i < argv.length; i++) {
  const a = argv[i]
  if (!a.startsWith('-')) continue
  if (!known.has(a)) {
    console.error(
      `\u274c 未知参数: ${a}\nusage: node enumerate-surface.mjs --run <dir> [--src <dir>...]`,
    )
    process.exit(2)
  }
  if (['--run', '--root', '--src'].includes(a)) i++
}
if (argv.includes('--help') || argv.includes('-h')) {
  console.log(
    'usage: node enumerate-surface.mjs --run <dir> [--src <dir>...] [--check] [--allow-drift]',
  )
  process.exit(0)
}
const flag = (n, d = null) => {
  const i = argv.indexOf(`--${n}`)
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d
}
const root = resolve(flag('root', '.'))
const runArg = flag('run')
if (!runArg) {
  console.error('\u274c 缺 --run <dir>')
  process.exit(2)
}
const runDir = resolve(root, runArg)
const sources = []
argv.forEach((a, i) => {
  if (a === '--src' && argv[i + 1]) sources.push(argv[i + 1])
})
// 默认范围：能力 run 里登记了 gods，就只扫这些 god 文件；否则回落全景表的参考仓库。
// 试运行踩过：R1 单文件 run 用默认 `ref_projects/pi-web` 扫出 2764 个表面点
// （其中 i18n 1211 条来自整个仓库），502KB 的 surface.json——分母大到无法认领，
// 于是"认领"这一步在第一次真实使用时就被人绕开。范围必须默认贴合能力。
if (!sources.length) {
  const statePath = join(runDir, 'state.json')
  const gods = existsSync(statePath) ? (JSON.parse(readFileSync(statePath, 'utf8')).gods ?? []) : []
  const godPaths = gods.map((g) => g.path).filter(Boolean)
  if (godPaths.length) sources.push(...godPaths)
  else sources.push('ref_projects/pi-web')
  console.error(
    `ℹ️ 未指定 --src，使用 ${godPaths.length ? `本 run 的 ${godPaths.length} 个 god 文件` : '默认参考仓库'}`,
  )
}

// 表面规则：kind → 匹配正则 + 代码（用于 ID）
const RULES = [
  {
    kind: 'handler',
    code: 'h',
    re: /\bon(?:Click|Change|Submit|KeyDown|KeyUp|DragEnd|DragStart|DragOver|Blur|Focus|MouseEnter|MouseLeave|PointerDown|PointerUp|Scroll|Input)\s*=\s*\{/g,
  },
  { kind: 'aria', code: 'a', re: /\baria-([a-z]+)\s*=/g },
  { kind: 'role', code: 'r', re: /\brole\s*=\s*['"]([a-z]+)['"]/g },
  { kind: 'command', code: 'c', re: /\bcase\s+['"]([a-z][\w.:-]*)['"]\s*:/g },
  { kind: 'event', code: 'e', re: /\bemit\s*\(\s*['"]([\w.:-]+)['"]/g },
  { kind: 'url', code: 'u', re: /searchParams\.(?:get|set|delete|has)\(\s*['"]([\w-]+)['"]/g },
  { kind: 'i18n', code: 'i', re: /\bt\(\s*['"]([\w.-]{3,})['"]/g },
  { kind: 'hotkey', code: 'k', re: /\bkey\s*===\s*['"]([\w+]+)['"]/g },
  // HTTP 调用：值是「方法 + 路径」，与方法名一起构成跨进程方言的最小单元。
  // 试运行教训：只抽 `case 'x':` 与 `emit('x')` 不抽 fetch，导致 C2 的契约对账
  // **无项可对**——真实的 `PATCH /api/skills` 与 `GET /api/skills/content` 就是靠人眼发现的。
  { kind: 'api', code: 'p', re: /\bfetch\(\s*[`'"]([^`'"]+)[`'"]/g },
]

const SKIP_DIRS = new Set(['node_modules', '.next', 'dist', 'demo', 'build', 'coverage'])
const SKIP_FILES = /\.(test|spec)\.(ts|tsx)$/

function abbreviate(file) {
  const base = basename(file).replace(/\.(ts|tsx)$/, '')
  const parts = base
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .flatMap((p) => {
      const camel = p.match(/[A-Z][a-z0-9]*/g)
      return camel && camel.length > 1 ? camel : [p]
    })
  const ini = parts.map((p) => p[0].toUpperCase()).join('')
  return (ini || base.slice(0, 2).toUpperCase()).slice(0, 4)
}

function walk(dir, out = []) {
  if (!existsSync(dir)) return out
  for (const e of readdirSync(dir)) {
    const p = join(dir, e)
    const st = statSync(p)
    if (st.isDirectory()) {
      if (SKIP_DIRS.has(e)) continue
      walk(p, out)
    } else if (/\.(ts|tsx)$/.test(e) && !SKIP_FILES.test(e)) out.push(p)
  }
  return out
}

const entries = []
const seen = new Map()
const sourceStats = []

for (const src of sources) {
  const dir = resolve(root, src)
  if (!existsSync(dir)) {
    console.error(`\u274c 源目录不存在: ${src}`)
    process.exit(2)
  }
  // --src 允许直接指向文件（能力 run 默认就是这么传的）
  const files = statSync(dir).isDirectory() ? walk(dir) : [dir]
  let count = 0
  for (const file of files) {
    const rel = relative(root, file)
    const lines = readFileSync(file, 'utf8').split('\n')
    const abbrev = abbreviate(file)
    lines.forEach((line, idx) => {
      for (const rule of RULES) {
        rule.re.lastIndex = 0
        for (const m of line.matchAll(rule.re)) {
          // handler 的 kind 编码更细：onClick / onChange 分开记，便于按类型核对
          const kind = rule.kind === 'handler' ? `handler:${m[0].split('=')[0].trim()}` : rule.kind
          const text = (m[1] || m[0]).trim()
          const norm = text.replace(/\s+/g, ' ').toLowerCase()
          const hash = createHash('sha1').update(`${rel}|${kind}|${norm}`).digest('hex').slice(0, 6)
          let id = `SF-${abbrev}-${rule.code}${hash}`
          const n = seen.get(id) || 0
          seen.set(id, n + 1)
          if (n) id = `${id}-${n + 1}`
          entries.push({ id, kind, text, file: rel, line: idx + 1 })
          count++
        }
      }
    })
  }
  sourceStats.push({ dir: src, files: files.length, points: count })
}

// api 点补方法名：方法的字面量常在 fetch 的下一行（`{ method: "PATCH" }`），
// 所以回读该文件附近 8 行取第一个 method:，缺省 GET；路径去掉 query 与模板片段。
// 同时把 text 规范成「METHOD /path」——契约里登记的就是这个形状，才能逐条对账。
const fileCache = new Map()
for (const e of entries) {
  if (e.kind !== 'api') continue
  const abs = resolve(root, e.file)
  if (!fileCache.has(abs)) fileCache.set(abs, readFileSync(abs, 'utf8').split('\n'))
  const lines = fileCache.get(abs)
  const win = lines.slice(e.line - 1, e.line + 8).join('\n')
  const m = win.match(/method\s*:\s*['"](\w+)['"]/)
  e.method = (m ? m[1] : 'GET').toUpperCase()
  e.path =
    e.text
      .replace(/\$\{[^}]*\}/g, '')
      .split('?')[0]
      .replace(/\/+$/, '') || '/'
  e.text = `${e.method} ${e.path}`
}

entries.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))

const byKind = {}
for (const e of entries) byKind[e.kind] = (byKind[e.kind] || 0) + 1

const payload = {
  generatedAt: new Date().toISOString(),
  sources: sourceStats,
  totals: { points: entries.length, byKind },
  entries,
}

// --check：与既有 surface.json 比对，发现表面变化（源码动了、或参考实现变了）
const checkPath = join(runDir, 'surface.json')
if (argv.includes('--check')) {
  if (!existsSync(checkPath)) {
    console.error(`\u274c 没有基线：${relative(root, checkPath)}——先不带 --check 跑一次`)
    process.exit(2)
  }
  const prev = JSON.parse(readFileSync(checkPath, 'utf8'))
  const prevIds = new Set((prev.entries || []).map((e) => e.id))
  const nowIds = new Set(entries.map((e) => e.id))
  const added = [...nowIds].filter((id) => !prevIds.has(id))
  const removed = [...prevIds].filter((id) => !nowIds.has(id))
  console.log(
    `表面点：${prevIds.size} → ${nowIds.size}（新增 ${added.length} / 消失 ${removed.length}）`,
  )
  for (const id of added.slice(0, 10)) {
    const e = entries.find((x) => x.id === id)
    console.log(`  \u2795 ${id}  ${e?.kind}  ${e?.file}:${e?.line}  ${e?.text}`)
  }
  for (const id of removed.slice(0, 10)) console.log(`  \u2796 ${id}`)
  const drift = added.length + removed.length > 0
  if (drift) {
    console.log('\n差异意味着：已有归属可能失效，或参考实现的表面变了。逐条处理后再更新基线。')
  }
  process.exit(drift && !argv.includes('--allow-drift') ? 1 : 0)
}

mkdirSync(runDir, { recursive: true })
writeFileSync(checkPath, `${JSON.stringify(payload, null, 2)}\n`)

// 分母同源（P2）：surface 条数是"分母"，必须记账才能被 gate 复算
writeProvenance(runDir, 'surface', {
  count: entries.length,
  source: 'cmd',
  cmd: `node ${relative(root, fileURLToPath(import.meta.url))} --run ${relative(root, runDir)}`,
})

if (argv.includes('--json')) {
  console.log(JSON.stringify(payload.totals, null, 2))
} else {
  console.log(`\u2705 表面枚举完成：${entries.length} 个表面点 → ${relative(root, checkPath)}`)
  for (const [k, v] of Object.entries(byKind).sort((a, b) => b[1] - a[1]))
    console.log(`   ${k}: ${v}`)
  console.log(
    '\n下一步：在 design/manifest.json 的 surfaces 里逐个认领（或写进 excluded 并说明理由）。',
  )
}
process.exit(0)
