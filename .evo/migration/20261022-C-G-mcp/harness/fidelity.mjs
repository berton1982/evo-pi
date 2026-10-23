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
const flow = 'mcp-settings'
const outDir = resolve(import.meta.dirname, 'snapshot/fidelity')
const out = (side) => `${outDir}/${flow}.${side}.json`

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

const browser = await chromium.launch()
// 只比 MCP 分区本体：弹窗里还有分区列表/关闭按钮，那是 AppShell 的壳，不是这一页的信息量
const PI_SCOPE = '[role="dialog"] .settings-section-host:not([hidden])'
const pi = await shot(
  browser,
  `${PIWEB}/?cwd=${encodeURIComponent(cwd)}`,
  async (page) => {
    // pi-web：AppShell 侧栏底部「设置」→ 弹窗「MCP」分区（弹窗不换 URL）
    await page.locator('button[aria-label="设置"], button[title="设置"]').first().click()
    const dialog = page.locator('[role="dialog"]').first()
    await dialog.waitFor()
    // 分区切换：pi-web 的弹窗里有一个（窄屏才显示的）select，值是分区 id。
    // 用 select 而不是点 nav 按钮：nav 按钮在桌面/窄屏两套 DOM 里都渲染，点击目标不稳，
    // 我在这上面连翻两次车（首版截到了「外观/字体」，第二次又截到「常规」）。
    // 必须等水合完成再切分区：弹窗出现后立刻切，hydration 会把 section 重置回「常规」
    // （这就是我前三次都截到「常规」的原因）
    await page.waitForTimeout(1200)
    await dialog.locator('select').first().selectOption('mcp', { force: true })
    await dialog.getByText(/添加 MCP/).first().waitFor({ timeout: 15000 })
    await page.waitForTimeout(800)
  },
  PI_SCOPE,
  /添加 MCP|已开启 \d+\/\d+/,
)
const EVO_SCOPE = '[data-component="mcp-settings"]'
const evo = await shot(
  browser,
  `${EVOPI}/sessions?cwd=${encodeURIComponent(cwd)}`,
  async (page) => {
    await page.locator('[data-component="sidebar-footer"] [data-section="settings"]').click()
    await page.locator('[data-section="mcp"]').click()
    // 等真正的内容（列出的 server 名），而不是等骨架：骨架在数据回来前就存在
    await page.locator(EVO_SCOPE).getByText(/alpha|还没有配置/).first().waitFor({ timeout: 15000 })
    // 详情区的动作（测试连接/移除）只在选中一行后渲染——不选就采不到，会误报成"我们没做"
    await page.locator(`${EVO_SCOPE} button[aria-label^="alpha"]`).first().click()
    await page.waitForTimeout(300)
    // 项目级 server 是第二次拉取才回来的：等 1.5s，而不是等第一次骨架（C-G 就漏过 gamma）
    await page.waitForTimeout(1500)
  },
  EVO_SCOPE,
  /MCP 服务器/,
)
await browser.close()

mkdirSync(outDir, { recursive: true })
writeFileSync(out('piweb'), `${JSON.stringify(pi, null, 2)}\n`)
writeFileSync(out('evopi'), `${JSON.stringify(evo, null, 2)}\n`)

const nameOf = (e) => `${e.role}:${e.name}`
const piNames = new Set(pi.entries.map(nameOf))
const evoNames = new Set(evo.entries.map(nameOf))
const onlyPi = [...piNames].filter((n) => !evoNames.has(n))
const onlyEvo = [...evoNames].filter((n) => !piNames.has(n))
const cover = piNames.size ? (piNames.size - onlyPi.length) / piNames.size : 0

console.log(`可及元素：pi-web ${piNames.size} / evo-pi ${evoNames.size}`)
console.log(`覆盖率（evo-pi 覆盖 pi-web 的元素比例）：${(cover * 100).toFixed(1)}%`)
console.log(`只有 pi-web 有（信息量缺口）：${onlyPi.length}`)
for (const n of onlyPi.slice(0, 12)) console.log('   -', n)
console.log(`只有 evo-pi 有（我们多加的）：${onlyEvo.length}`)
for (const n of onlyEvo.slice(0, 6)) console.log('   +', n)
console.log(`正文长度：pi-web ${pi.textLength} 字 / evo-pi ${evo.textLength} 字`)
console.log(`写入 ${outDir}`)
