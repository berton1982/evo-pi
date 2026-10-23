// 符号全集导出器：输出 `- **Name** (Kind) in \`Scope\` — \`path:line\``。
//
// 两种模式，差别不是"快慢"而是"分母是不是同一个东西"：
//
//   --mode ts      起一个真 tsserver（`.pi/supi/config.json` 指定或全局 5.x），走
//                  open + navtree。这是编辑器/LSP 看到的同一棵树，试点实测
//                  SkillsConfig.tsx = 451 条（`code_resolve` 报 390，差异来自
//                  code_resolve 自己做了合并/过滤）。
//   --mode program 进程内 `createLanguageService().getNavigateToItems('')`。同一文件
//                  只有 175 条——**它不是 LSP 的等价物**，只是 TS 引擎的一个子集视角。
//                  仅当机器上找不到 5.x tsserver 时作为降级手段，且会写进 meta 里。
//
// 为什么这层区分要写进 meta：试点第一轮 C1 的 `lspSource` 门认的是 state.json 里
// 自己填的字符串 'LSP'，而 TypeScript 其实是 7 的原生发行版（无 tsserver.js）——
// 175 条冒充 390 条，门全绿。现在门会读 meta，降级模式直接判红。
//
// 用法：
//   node scripts/enumerate-symbols.mjs --file <path> [--run <dir>] [--out <md>]
//        [--mode auto|ts|program] [--ts <dir>] [--compare <md>] [--allow-drift] [--json]
// 退出码：0 成功；1 --compare 有漂移；2 参数错；3 找不到 typescript/tsserver

import { writeProvenance } from './lib/provenance.mjs'
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { basename, dirname, join, relative, resolve } from 'node:path'
import { flattenNavTree, resolveTsserver, TsClient, tsserverInfo } from './lib/tsclient.mjs'

const argv = process.argv.slice(2)
const flag = (name, def = null) => {
  const i = argv.indexOf(`--${name}`)
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : def
}
const has = (name) => argv.includes(`--${name}`)

const file = flag('file')
if (!file) {
  console.error(
    '用法: enumerate-symbols.mjs --file <path> [--run <dir>] [--out <md>] [--mode auto|ts|program] [--compare <md>]',
  )
  process.exit(2)
}
const absFile = resolve(file)
if (!existsSync(absFile)) {
  console.error(`文件不存在: ${absFile}`)
  process.exit(2)
}
const root = resolve(flag('root', process.cwd()))
const runDir = flag('run') ? resolve(root, flag('run')) : null
const mode = flag('mode', 'auto')

/** 从文件所在目录向上找含 typescript 的 node_modules */
function findTs(from) {
  let dir = dirname(from)
  for (let i = 0; i < 12; i++) {
    const cand = join(dir, 'node_modules', 'typescript')
    if (existsSync(join(cand, 'package.json'))) return cand
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return null
}

const KIND = {
  function: 'function',
  method: 'method',
  const: 'const',
  let: 'let',
  variable: 'variable',
  class: 'class',
  interface: 'interface',
  type: 'type',
  enum: 'enum',
  enumMember: 'enumMember',
  property: 'property',
  getter: 'getter',
  setter: 'setter',
  parameter: 'param',
  local: 'local',
  script: 'script',
  module: 'module',
}

/** 摊平后的导航树条目有重复（声明合并、同名重载），按 容器+名字+行 去重 */
function dedupe(symbols) {
  const seen = new Set()
  const out = []
  for (const s of symbols) {
    const key = `${s.container ?? ''}\u0000${s.name}\u0000${s.line ?? '?'}\u0000${s.kind}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(s)
  }
  return out
}

// ── ts 模式：真 tsserver ──
async function enumerateWithTsserver(tsserverPath) {
  const client = await TsClient.open({ tsserverPath, cwd: root })
  try {
    await client.openFile(absFile)
    const info = await client.projectInfo(absFile)
    const tree = await client.navTree(absFile)
    const symbols = dedupe(
      flattenNavTree(tree).map((s) => ({
        name: s.name,
        kind: KIND[s.kind] || String(s.kind),
        scope: s.container,
        line: s.line,
      })),
    )
    return {
      symbols,
      meta: {
        mode: 'tsserver',
        tsserverPath: relative(root, tsserverPath) || tsserverPath,
        tsVersion: tsserverInfo(tsserverPath)?.version ?? 'unknown',
        project: info?.configFileName ? relative(root, info.configFileName) : null,
        projectLoaded: client.projects.map((p) => (p ? relative(root, p) : p)),
      },
    }
  } finally {
    client.close()
  }
}

// ── program 模式：进程内语言服务（降级） ──
function enumerateWithProgram(tsDir) {
  const ts = createRequire(join(tsDir, 'x.js'))(tsDir)
  const scripts = new Map()
  const readScript = (f) => {
    if (!scripts.has(f)) scripts.set(f, readFileSync(f, 'utf8'))
    return scripts.get(f)
  }
  const options = {
    allowJs: true,
    jsx: ts.JsxEmit.ReactJSX,
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    strict: true,
    noEmit: true,
    skipLibCheck: true,
    esModuleInterop: true,
    isolatedModules: true,
  }
  const host = {
    getScriptFileNames: () => [absFile],
    getScriptVersion: () => '1',
    getScriptSnapshot: (f) => {
      const text = existsSync(f) ? readScript(f) : undefined
      return text === undefined ? undefined : ts.ScriptSnapshot.fromString(text)
    },
    getCurrentDirectory: () => dirname(absFile),
    getCompilationSettings: () => options,
    getDefaultLibFileName: (o) => ts.getDefaultLibFilePath(o),
    fileExists: (f) => existsSync(f) && statSync(f).isFile(),
    readFile: (f) => (existsSync(f) ? readFileSync(f, 'utf8') : undefined),
    readDirectory: (rootDir, extensions) => {
      const out = []
      const walk = (d) => {
        for (const name of readdirSync(d)) {
          if (name === 'node_modules' || name.startsWith('.')) continue
          const p = join(d, name)
          if (statSync(p).isDirectory()) walk(p)
          else if (extensions.some((e) => name.endsWith(e))) out.push(p)
        }
      }
      walk(rootDir)
      return out
    },
    directoryExists: (d) => existsSync(d) && statSync(d).isDirectory(),
    getDirectories: (d) =>
      existsSync(d) ? readdirSync(d).filter((x) => statSync(join(d, x)).isDirectory()) : [],
  }
  const service = ts.createLanguageService(host, ts.createDocumentRegistry())
  // 参数顺序：getNavigateToItems(searchValue, maxResultCount, fileName, excludeDts)。
  // 曾把 fileName 当 searchValue 传，得到 0 条并被误判成"文件没有声明"。
  const items = service.getNavigateToItems('', 1_000_000, absFile) || []
  const symbols = dedupe(
    items
      .filter((it) => it.name)
      .map((it) => ({
        name: it.name,
        kind: KIND[String(it.kind)] || String(it.kind),
        scope: it.containerName || null,
        line: null,
      })),
  )
  return { symbols, meta: { mode: 'program', tsVersion: ts.version, project: null } }
}

const tsserverPath = has('ts') ? join(flag('ts'), 'lib/tsserver.js') : resolveTsserver({ root })
let result
if (mode === 'program') {
  const tsDir = flag('ts') || findTs(absFile)
  if (!tsDir) {
    console.error('找不到 typescript：用 --ts <含 typescript 的 node_modules 目录> 指定')
    process.exit(3)
  }
  result = enumerateWithProgram(tsDir)
} else if (mode === 'ts' || (mode === 'auto' && tsserverPath)) {
  if (!tsserverPath) {
    console.error(
      '找不到 tsserver.js：在 .pi/supi/config.json 里指定 lsp.servers.typescript.initializationOptions.tsserver.path，或 npm i -g typescript@5',
    )
    process.exit(3)
  }
  result = await enumerateWithTsserver(tsserverPath)
} else {
  const tsDir = flag('ts') || findTs(absFile)
  if (!tsDir) {
    console.error('既没有 tsserver 也没有本地 typescript：无法导出符号全集')
    process.exit(3)
  }
  console.error('⚠️ 降级到 program 模式（没有 tsserver）：分母不等于 LSP，C1 的 lspSource 门会判红')
  result = enumerateWithProgram(tsDir)
}

const rel = relative(root, absFile) || file
const text = readFileSync(absFile, 'utf8')
const totalLines = text.split('\n').length
const symbols = result.symbols

// --compare：与既有符号文件比漂移。分母换过一次就再也比不上——所以必须留下比对手段。
if (has('compare')) {
  const prevPath = resolve(root, flag('compare'))
  if (!existsSync(prevPath)) {
    console.error(`对比基线不存在: ${prevPath}`)
    process.exit(2)
  }
  const prev = new Set(
    readFileSync(prevPath, 'utf8')
      .split('\n')
      .map((l) => l.match(/^- \*\*(.+?)\*\* \((.+?)\)/))
      .filter(Boolean)
      .map((m) => `${m[1]}|${m[2]}`),
  )
  const now = new Set(symbols.map((s) => `${s.name}|${s.kind}`))
  const added = [...now].filter((x) => !prev.has(x))
  const removed = [...prev].filter((x) => !now.has(x))
  console.log(`符号：${prev.size} → ${now.size}（新增 ${added.length} / 消失 ${removed.length}）`)
  for (const a of added.slice(0, 10)) console.log(`  ➕ ${a}`)
  for (const r of removed.slice(0, 10)) console.log(`  ➖ ${r}`)
  const drift = added.length + removed.length > 0
  if (drift) console.log('\n差异意味着：要么源码变了，要么分母换了（降级模式）。两种都要解释清楚。')
  process.exit(drift && !has('allow-drift') ? 1 : 0)
}

// 分母同源（P2）：符号条数是"分母"，与 .meta.json 一起记账
if (runDir) {
  writeProvenance(runDir, 'symbols', {
    count: symbols.length,
    source: 'cmd',
    cmd: `node .pi/skills/migrating-god-files/scripts/enumerate-symbols.mjs --run ${relative(root, runDir)} --file ${rel}`,
  })
}

const meta = {
  file: rel,
  ...result.meta,
  count: symbols.length,
  lines: totalLines,
  generatedAt: new Date().toISOString(),
}

if (has('json')) {
  console.log(JSON.stringify({ ...meta, symbols }, null, 2))
  process.exit(0)
}

const modeNote =
  result.meta.mode === 'tsserver'
    ? [
        `> 来源：**tsserver**（\`${result.meta.tsserverPath}\`，TypeScript ${result.meta.tsVersion}）。`,
        `> 工程：\`${result.meta.project ?? '（推断工程）'}\`——与编辑器里的 LSP 是同一棵树。`,
      ]
    : [
        '> 来源：**program 模式降级**（进程内 `getNavigateToItems`）。',
        '> ⚠️ 这不是 LSP 等价物（试点实测同一文件 175 vs 451）：拿不到局部变量与结构性节点。',
        '> C1 的 `lspSource` 门会判红——先按 `references/lsp-tooling.md §1.2` 把 tsserver 修好。',
      ]

const md = [
  `# 符号全集 — \`${rel}\``,
  '',
  ...modeNote,
  `> 文件行数：${totalLines}；符号数：**${symbols.length}**；导出时间：${meta.generatedAt}`,
  '',
  '## 符号（按出现顺序）',
  '',
  ...symbols.map(
    (r) =>
      `- **${r.name}** (${r.kind})${r.scope ? ` in \`${r.scope}\`` : ''} — \`${rel}:${r.line ?? '?'}\``,
  ),
  '',
].join('\n')

const out =
  flag('out') || (runDir ? join(runDir, 'evidence', `symbols-${basename(absFile)}.md`) : null)
const metaOut = out ? out.replace(/\.md$/, '.meta.json') : null
if (out) {
  mkdirSync(dirname(resolve(out)), { recursive: true })
  writeFileSync(out, md, 'utf8')
  if (metaOut) writeFileSync(metaOut, `${JSON.stringify(meta, null, 2)}\n`)
  console.log(
    `✅ ${relative(root, resolve(out))}：${symbols.length} 个符号（${rel}，${meta.mode}${meta.tsVersion ? ` ${meta.tsVersion}` : ''}）`,
  )
  if (metaOut) console.log(`   meta: ${relative(root, resolve(metaOut))}`)
} else {
  process.stdout.write(md)
}
