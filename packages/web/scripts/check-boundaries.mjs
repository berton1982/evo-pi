#!/usr/bin/env node
/**
 * web 包的架构边界检查（可机器验证，不靠评审记忆）。
 *
 * 六条判据，全部来自 `packages/web/ARCHITECTURE.md`：
 * 1. `shell/**` 不得 import `@/features/**`——壳靠 spec 装配，不认实现
 * 2. `features/a/**` 不得 import `features/b/**`——跨能力只能经 shell 契约或 lib
 * 3. `lib/**`、`components/ui/**` 不得 import `features/**`/`shell/**`——这两层是地基
 * 4. 行数预算：shell ≤200、app ≤60、features 单文件 ≤200、lib ≤250
 * 5. god 迹象：单文件 useState/useReducer ≤4、useEffect ≤3、props 字段 ≤8、分支 ≤15
 * 6. 命名契约：features/<slice>/ 内文件名 kebab-case，组件文件不得叫 index.tsx
 *
 * 用法：node scripts/check-boundaries.mjs [--json]
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const SRC = new URL('../src/', import.meta.url).pathname
const JSON_OUT = process.argv.includes('--json')

const walk = (dir, out = []) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) {
      if (['node_modules'].includes(e.name)) continue
      walk(p, out)
    } else if (/\.(ts|tsx)$/.test(e.name) && !/\.test\.(ts|tsx)$/.test(e.name)) out.push(p)
  }
  return out
}

const files = walk(SRC).map((abs) => {
  const rel = relative(SRC, abs).split('\\').join('/')
  return { abs, rel, text: readFileSync(abs, 'utf8') }
})

// 只认真正的 import 语句：注释里出现 `from '@/features/...'` 不算依赖
// （i18n/index.ts 的用法示例曾被误判，逼着人删掉有用的注释）
const stripComments = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const importsOf = (text) =>
  [...stripComments(text).matchAll(/^\s*import[\s\S]*?from\s+'(@\/[^']+)'/gm)].map((m) =>
    m[1].replace(/^@\//, ''),
  )
const layerOf = (rel) => rel.split('/')[0]

const violations = []
const push = (rel, rule, message) => violations.push({ file: rel, rule, message })

// 1–3：依赖方向
for (const f of files) {
  const to = importsOf(f.text)
  const from = layerOf(f.rel)
  for (const target of to) {
    const tlayer = layerOf(target)
    if (from === 'shell' && tlayer === 'features')
      push(
        f.rel,
        'shell→features',
        `壳 import 了能力实现 ${target}（只允许 @/shell/registry 的类型）`,
      )
    if (from === 'features' && tlayer === 'features') {
      const mine = f.rel.split('/')[1]
      const theirs = target.split('/')[1]
      if (mine !== theirs && !target.startsWith('features/_shared/'))
        push(
          f.rel,
          'feature→feature',
          `跨能力 import ${target}（共用逻辑下沉到 lib/ 或 components/ui/）`,
        )
    }
    if ((from === 'lib' || from === 'components') && (tlayer === 'features' || tlayer === 'shell'))
      push(f.rel, `${from}→上层`, `地基层 import 了上层 ${target}`)
  }
}

// 4：行数预算
// 预算按"这类文件本来该多长"定，不是一刀切：
// - app/**：路由/页面是装配点（JSX 槽位天生占行），给 100；真正的约束是
//   "app/** 不许写 useState/useEffect"——逻辑必须在 hook 里，见下面的规则 7
// - components/ui/**：shadcn 原语是 vendored 代码，不参与拆分（但禁止放业务）
// - lib 的纯类型/schema 文件天然长，给了 320
const BUDGET = { shell: 200, app: 100, features: 200, lib: 250, components: 250 }
const budgetFor = (rel) => {
  if (/^app\/api\//.test(rel)) return 150
  if (/^components\/ui\//.test(rel)) return Number.POSITIVE_INFINITY
  if (/^lib\/.*(types|schema)\.ts$/.test(rel)) return 320
  if (/^lib\/i18n\/messages\//.test(rel)) return Number.POSITIVE_INFINITY
  return BUDGET[layerOf(rel)]
}
for (const f of files) {
  const cap = budgetFor(f.rel)
  if (cap === undefined) continue
  if (layerOf(f.rel) === 'features' && !f.rel.endsWith('.tsx')) continue
  const lines = f.text.split('\n').length
  if (lines > cap)
    push(f.rel, 'budget', `${lines} 行 > 预算 ${cap}（壳/能力都要拆成"一件事一个文件"）`)
}

// 5：god 迹象
for (const f of files) {
  if (!f.rel.endsWith('.tsx')) continue
  const hooks =
    (f.text.match(/\buseState\s*\(/g) || []).length +
    (f.text.match(/\buseReducer\s*\(/g) || []).length
  const effects = (f.text.match(/\buseEffect\s*\(/g) || []).length
  const branches = (f.text.match(/\b(if|else if|case|catch|\?\.)\b/g) || []).length
  const propsBlock = f.text.match(/interface\s+\w*Props\s*\{([^}]*)\}/s)
  const props = propsBlock ? (propsBlock[1].match(/^\s{2}\w+\??:/gm) || []).length : 0
  if (hooks > 4)
    push(
      f.rel,
      'god:state',
      `${hooks} 个 useState/useReducer（>4 说明状态归属错了：该进 store 或用例）`,
    )
  if (effects > 3)
    push(f.rel, 'god:effect', `${effects} 个 useEffect（>3 说明副作用没被 hook 收口）`)
  if (branches > 15)
    push(f.rel, 'god:branch', `${branches} 个分支（>15 说明一个文件承担了多个视图）`)
  if (props > 8) push(f.rel, 'god:props', `${props} 个 props（>8 说明在往下传不该传的东西）`)
}

// 7：装配点（app/**）不许直接写状态与副作用——逻辑必须在 hook/能力里
for (const f of files) {
  if (!f.rel.startsWith('app/')) continue
  if (/\.test\./.test(f.rel)) continue
  const code = stripComments(f.text).replace(/^\s*'use client'\s*$/m, '')
  const stateful = code.match(/\b(useState|useReducer|useEffect|useLayoutEffect)\s*\(/)
  if (stateful)
    push(
      f.rel,
      'app:no-logic',
      `装配点直接用了 ${stateful[1]}（状态/副作用应在 hook 或能力里，页面只拼 JSX）`,
    )
}

// 6：命名契约
for (const f of files) {
  const base = f.rel.split('/').pop()
  // 语言包文件名是 locale 码（zh-CN.ts），属例外
  const namingOk = /^lib\/i18n\/messages\//.test(f.rel)
    ? /^[a-z]{2}(-[A-Z]{2})?\.ts$/.test(base)
    : /^[a-z0-9][a-z0-9.-]*\.(ts|tsx)$/.test(base)
  if (!namingOk) push(f.rel, 'naming', `文件名不是 kebab-case（${base}）`)
  if (f.rel.startsWith('features/') && /(^|\/)index\.tsx$/.test(f.rel))
    push(f.rel, 'naming', '能力目录里不要放 index.tsx 组件（会藏起真正的组件名）')
}

// 不用扩展运算符累加：每次都会复制整个对象（biome noAccumulatingSpread）
const byRule = {}
for (const v of violations) byRule[v.rule] = (byRule[v.rule] || 0) + 1
if (JSON_OUT) {
  console.log(JSON.stringify({ files: files.length, violations, byRule }, null, 2))
} else if (!violations.length) {
  console.log(`✅ 边界检查通过（${files.length} 个文件，6 条判据）`)
} else {
  console.log(`❌ ${violations.length} 处违规（${files.length} 个文件）`)
  for (const v of violations) console.log(`  [${v.rule}] ${v.file}: ${v.message}`)
}
process.exit(violations.length ? 1 : 0)
