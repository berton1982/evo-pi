#!/usr/bin/env node
/**
 * extract-conventions — 从仓库现有代码提取分层事实，写到 `<run>/arch/conventions.json`。
 *
 * 用法：
 *   node scripts/extract-conventions.mjs --run .evo/migration/<run> [--root .] [--stdout]
 *
 * 为什么需要它：P2.5 过去是"照着教科书从零写 AD"，于是写成
 * `application/`（仓库实际是 `use-cases/`）、把 adapter 画在 web 侧。
 * 现在 AD 的分层必须与这份事实对得上（`conventions` 门）。
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { argv } from 'node:process'
import { extractConventions } from './lib/conventions.mjs'

function arg(name, fallback = null) {
  const i = argv.indexOf(`--${name}`)
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback
}

const root = resolve(arg('root', '.'))
const run = arg('run')
const conventions = extractConventions(root)

if (!run || argv.includes('--stdout')) {
  process.stdout.write(`${JSON.stringify(conventions, null, 2)}\n`)
  process.exit(0)
}

const out = resolve(join(run, 'arch/conventions.json'))
mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, `${JSON.stringify(conventions, null, 2)}\n`)

console.log(`✅ 从 ${conventions.totalFiles} 个源文件提取到 ${conventions.layers.length} 个层`)
for (const l of conventions.layers.slice(0, 8)) {
  const top = l.paths.slice(0, 2).map((p) => p.path)
  console.log(`   ${l.layer}: ${l.files} 个文件 → ${top.join('、')}`)
}
console.log(`   写入 ${out}`)
