#!/usr/bin/env node
/**
 * 保真快照（P7）：把两边的界面各拍一张"结构指纹"，比"信息量"而不是比像素。
 *
 * 为什么不能只比 e2e：e2e 断言的是"我们预期的东西存在"，缺一个字段、少一段说明照样绿
 * （C-G 就是 18 个用例全过、用户仍说"差距很大"）。这里改比 **aria 角色 + 可及名称** 的集合，
 * 它既是键盘/读屏用户真正拿到的东西，也是"信息量"的可量化代理。
 *
 * 输出：harness/snapshot/fidelity/<flow>.{piweb,evopi}.json
 * 用法：PI_PARITY_CWD=<cwd> node <run>/harness/fidelity.mjs [--flow mcp-settings]
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from '@playwright/test'

const PIWEB = process.env.PIWEB_BASE ?? 'http://127.0.0.1:30141'
const EVOPI = process.env.EVOPI_BASE ?? 'http://127.0.0.1:30041'
const cwd = process.env.PI_PARITY_CWD ?? process.cwd()
const outDir = resolve(import.meta.dirname, 'snapshot/fidelity')
const out = (name, side) => `${outDir}/${name}.${side}.json`

/** 采集：每个可交互/可读元素 → {role, name, depth}。名称取 aria-label / 文本前 80 字。 */
async function capture(page, scope, contains = null) {
  return page.evaluate(
    ({ scopeSel, containsSrc }) => {
      const match = containsSrc ? new RegExp(containsSrc) : null
    const out = []
    // 同一选择器可能命中多个节点（弹窗 + 隐藏的历史弹窗），按内容挑真正在显示的那个
    const candidates = scopeSel ? [...document.querySelectorAll(scopeSel)] : [document.body]
    const root = candidates.find((el) => !match || match.test(el.textContent ?? '')) ?? candidates[0]
    if (!root) return out
    const walk = (node, depth) => {
      for (const el of node.querySelectorAll('*')) {
        const role = el.getAttribute('role') ?? null
        const aria = el.getAttribute('aria-label')
        const tag = el.tagName.toLowerCase()
        // 采集口径：有语义的元素（role / aria-label / aria-pressed / 交互标签）+
        // 结构性标题与列表项。只收"可交互"会把纯文本骨架漏掉，两边就变成比不出东西。
        const interactive = ['button', 'input', 'select', 'textarea', 'a'].includes(tag)
        const landmark = ['h1', 'h2', 'h3', 'li', 'dt', 'th'].includes(tag)
        const states = el.getAttribute('aria-pressed') ?? el.getAttribute('aria-checked') ?? null
        const keep = Boolean(role || aria || interactive || landmark || states !== null)
        const name = (aria ?? el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 80)
        if (keep && name) out.push({ role: role ?? tag, name, depth, state: states })
        // 必须无条件下沉：早先把 `continue` 放在递归前，导致无语义的容器（div/ul/section）
        // 整棵子树被跳过，两边采到的元素数根本不是一个口径。
        walk(el, depth + 1)
      }
    }
    walk(root, 0)
    return out
    },
    { scopeSel: scope, containsSrc: contains ? contains.source : null },
  )
}

async function shot(browser, url, open, scope, contains = null) {
  const page = await browser.newPage({ locale: 'zh-CN' })
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  if (open) await open(page)
  const entries = await capture(page, scope, contains)
  const text = entries.length
    ? (await page.locator(scope ?? 'body').filter({ hasText: contains ?? /.*/ }).first().innerText())
        .replace(/\s+/g, ' ')
        .trim()
    : ''
  await page.close()
  return { capturedAt: new Date().toISOString(), url, entries, textLength: text.length, text }
}


/** 流程定义：每一步都写明"打开什么、等什么、拍哪块" */
const FLOWS = {
  shell: {
    pi: {
      url: () => `${PIWEB}/?cwd=${encodeURIComponent(cwd)}`,
      scope: 'body',
      contains: /设置/,
      open: async (page) => {
        // 空会话的入口页 = AppShell 本体（不点设置：这里比的就是壳自己）
        await page.waitForTimeout(2500)
      },
    },
    evo: {
      url: () => `${EVOPI}/?cwd=${encodeURIComponent(cwd)}`,
      scope: 'body',
      contains: /会话|侧栏|设置/,
      open: async (page) => {
        await page.waitForTimeout(2000)
      },
    },
  },
}

const flowName = process.argv.includes('--flow')
  ? process.argv[process.argv.indexOf('--flow') + 1]
  : 'shell'
const flow = FLOWS[flowName]
if (!flow) {
  console.error(`未知流程 ${flowName}，可用：${Object.keys(FLOWS).join(', ')}`)
  process.exit(2)
}

const browser = await chromium.launch()
const pi = await shot(browser, flow.pi.url(), flow.pi.open, flow.pi.scope, flow.pi.contains)
const evo = await shot(browser, flow.evo.url(), flow.evo.open, flow.evo.scope, flow.evo.contains)
await browser.close()

mkdirSync(outDir, { recursive: true })
writeFileSync(out(flowName, 'piweb'), `${JSON.stringify(pi, null, 2)}\n`)
writeFileSync(out(flowName, 'evopi'), `${JSON.stringify(evo, null, 2)}\n`)

const nameOf = (e) => `${e.role}:${e.name}`
const piNames = new Set(pi.entries.map(nameOf))
const evoNames = new Set(evo.entries.map(nameOf))
const onlyPi = [...piNames].filter((n) => !evoNames.has(n))
const onlyEvo = [...evoNames].filter((n) => !piNames.has(n))
const cover = piNames.size ? (piNames.size - onlyPi.length) / piNames.size : 0

console.log(`[${flowName}] 可及元素：pi-web ${piNames.size} / evo-pi ${evoNames.size}`)
console.log(`覆盖率：${(cover * 100).toFixed(1)}%`)
console.log(`只有 pi-web 有：${onlyPi.length}`)
for (const n of onlyPi.slice(0, 20)) console.log('   -', n)
console.log(`只有 evo-pi 有：${onlyEvo.length}`)
for (const n of onlyEvo.slice(0, 10)) console.log('   +', n)
console.log(`写入 ${outDir}/${flowName}.*.json`)
