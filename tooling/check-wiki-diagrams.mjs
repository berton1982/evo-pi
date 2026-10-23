#!/usr/bin/env node
/**
 * check-wiki-diagrams — gate for the Mermaid diagrams under `openwiki/`.
 *
 * WHY THIS EXISTS
 * OpenWiki validates every ```mermaid fence before finalizing a page. When the
 * optional `mermaid` + `jsdom` peer deps are absent it falls back to a
 * conservative heuristic, and any fence the heuristic flags is rewritten to a
 * ```text fence plus an `openwiki: mermaid parse failed` comment. A CI job that
 * lacks those deps therefore silently downgrades otherwise-valid diagrams, and
 * the wiki ends up showing raw flowchart source as a code block.
 *
 * The heuristic is deliberately paranoid, so a locally-authored diagram can be
 * correct and still get downgraded. The rules below are the cheapest way to
 * avoid that class of regression without adding heavy deps to the repo.
 *
 * WHAT IT CHECKS (in order of cost)
 * 1. Zero-dependency heuristics, copied from OpenWiki's src/mermaid/validate.ts
 *    `heuristicError()`. Always runs.
 * 2. Leftover `openwiki: mermaid parse failed` comments, which mean a diagram
 *    was already downgraded and nobody restored it.
 * 3. `mermaid.parse()` and `mermaid.render()` when `mermaid` + `jsdom` can be
 *    resolved (repo node_modules, OPENWIKI_MERMAID_MODULES, or global npm root).
 *    Skipped with a notice when unavailable — never a hard failure.
 *
 * USAGE
 *   node tooling/check-wiki-diagrams.mjs            # check openwiki/
 *   node tooling/check-wiki-diagrams.mjs <dir>...   # check other dirs too
 *
 * EXIT CODES
 *   0  all fences pass (or full validation was skipped)
 *   1  at least one fence fails, or a degraded diagram is still present
 */

import { execSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DEFAULT_TARGET = join(REPO_ROOT, 'openwiki')

/**
 * Heuristics mirrored from openwiki's src/mermaid/validate.ts (heuristicError).
 *
 * Keep these byte-identical to upstream: a local edit here would let a diagram
 * through locally that a CI run without mermaid installed still downgrades.
 */
const RE_END_NODE = /(?:^|\n|\s)end\s*[[({]/u
const RE_END_ARROW = /-->\s*end\s*(?:$|\n|;)/mu
const RE_SEMICOLON_IN_LABEL = /[[({][^)\]}]*;[^)\]}]*[)\]}]/u
const RE_ANGLE_IN_LABEL = /[[({][^)\]}]*[<>][^)\]}]*[)\]}]/u

const DEGRADED_MARKER = 'openwiki: mermaid parse failed'

/** Returns OpenWiki's fallback verdict for one diagram body, or undefined. */
function heuristicError(body) {
  const firstWord = body.trim().split(/\s+/u)[0]?.toLowerCase() ?? ''
  const isFlowchart = firstWord === 'flowchart' || firstWord === 'graph'

  if (isFlowchart && (RE_END_NODE.test(body) || RE_END_ARROW.test(body))) {
    return '`end` is a reserved word and cannot be a flowchart node id; rename the node.'
  }
  if (RE_SEMICOLON_IN_LABEL.test(body)) {
    return 'a semicolon inside a label breaks rendering; rephrase the label.'
  }
  if (RE_ANGLE_IN_LABEL.test(body)) {
    return 'an unescaped angle bracket inside a label breaks rendering; rephrase the label.'
  }
  return undefined
}

/** Recursively lists Markdown files, skipping OpenWiki's generated indexes. */
function collectMarkdown(dir) {
  const out = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      out.push(...collectMarkdown(full))
    } else if (entry.endsWith('.md') && entry !== 'index.md') {
      out.push(full)
    }
  }
  return out
}

/** Extracts every ```mermaid fence body with its 1-based opening line. */
function extractMermaidFences(markdown) {
  const lines = markdown.split('\n')
  const fences = []
  let open = -1

  for (let i = 0; i < lines.length; i++) {
    const fence = /^```(\w*)\s*$/u.exec(lines[i])
    if (!fence) continue
    if (open === -1) {
      if (fence[1] === 'mermaid') open = i
    } else {
      fences.push({ line: open + 1, body: lines.slice(open + 1, i).join('\n') })
      open = -1
    }
  }
  return fences
}

/**
 * Locates mermaid + jsdom without declaring them as repo dependencies.
 *
 * CI already installs them globally (see .github/workflows/openwiki-update.yml),
 * and adding ~150MB to every `pnpm install` to validate docs is a bad trade.
 * Returns undefined when they cannot be found; the caller downgrades to
 * heuristic-only instead of failing.
 */
async function loadMermaidParser() {
  const candidates = []
  // biome-ignore lint/suspicious/noUndeclaredEnvVars: not a turbo task, so there is no cache key to declare it under.
  const overrideDir = process.env.OPENWIKI_MERMAID_MODULES
  if (overrideDir) {
    candidates.push(overrideDir)
  }
  candidates.push(join(REPO_ROOT, 'node_modules'))
  try {
    candidates.push(
      execSync('npm root -g', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(),
    )
  } catch {
    // No global npm root (unusual); the remaining candidates still apply.
  }

  for (const modulesDir of candidates) {
    const requireFrom = createRequire(join(modulesDir, 'noop.cjs'))
    try {
      requireFrom.resolve('mermaid')
      requireFrom.resolve('jsdom')
    } catch {
      continue
    }
    try {
      const { JSDOM } = await import(pathToFileURL(join(modulesDir, 'jsdom', 'lib', 'api.js')).href)
      const dom = new JSDOM('<!DOCTYPE html><body><div id="check-root"></div></body>')
      globalThis.window = dom.window
      globalThis.document = dom.window.document
      // Mermaid injects stylesheets during render; jsdom's CSSOM is incomplete.
      globalThis.CSSStyleSheet ??= dom.window.CSSStyleSheet ?? class {}
      dom.window.SVGElement.prototype.getBBox = () => ({ x: 0, y: 0, width: 100, height: 20 })
      dom.window.SVGElement.prototype.getComputedTextLength = () => 100

      const mermaid = (await import(pathToFileURL(requireFrom.resolve('mermaid')).href)).default
      mermaid.initialize({ startOnLoad: false })
      return { mermaid, document: dom.window.document }
    } catch {
      // Found the packages but could not boot them; try the next candidate.
    }
  }
  return undefined
}

async function main() {
  const targets = process.argv.slice(2).length > 0 ? process.argv.slice(2) : [DEFAULT_TARGET]

  const files = []
  for (const target of targets) {
    if (!existsSync(target)) {
      console.error(`error: no such path: ${target}`)
      process.exit(1)
    }
    files.push(...collectMarkdown(target))
  }

  if (files.length === 0) {
    console.log('no Markdown files to check')
    return
  }

  const parser = await loadMermaidParser()
  let fenceCount = 0
  let failureCount = 0
  const rel = (file) => file.replace(`${REPO_ROOT}/`, '')

  for (const file of files) {
    const markdown = readFileSync(file, 'utf8')

    markdown.split('\n').forEach((line, i) => {
      if (line.includes(DEGRADED_MARKER)) {
        failureCount++
        console.error(`FAIL ${rel(file)}:${i + 1}  diagram was downgraded to a text fence`)
      }
    })

    for (const fence of extractMermaidFences(markdown)) {
      fenceCount++
      const problems = []

      const heuristic = heuristicError(fence.body)
      if (heuristic) {
        problems.push(`OpenWiki heuristic: ${heuristic}`)
      }

      if (parser) {
        try {
          await parser.mermaid.parse(fence.body)
        } catch (error) {
          problems.push(`mermaid.parse: ${String(error?.message ?? error).split('\n')[0]}`)
        }
      }

      if (problems.length > 0) {
        failureCount++
        console.error(`FAIL ${rel(file)}:${fence.line}`)
        for (const problem of problems) console.error(`       ${problem}`)
      }
    }
  }

  const mode = parser ? 'heuristic + mermaid.parse' : 'heuristic only (mermaid/jsdom not found)'
  console.log(`checked ${fenceCount} mermaid fence(s) in ${files.length} file(s) — ${mode}`)

  if (!parser) {
    console.log(
      'note: full validation skipped. Install them or set OPENWIKI_MERMAID_MODULES to check rendering too.',
    )
  }
  if (failureCount > 0) {
    console.error(`${failureCount} problem(s) found`)
    process.exit(1)
  }
  console.log('all diagrams OK')
}

await main()
