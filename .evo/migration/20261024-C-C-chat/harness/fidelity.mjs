#!/usr/bin/env node
/**
 * 保真快照（P7）：把两边的界面各拍一张"结构指纹"，比"信息量"而不是比像素。
 *
 * 为什么不能只比 e2e：e2e 断言的是"我们预期的东西存在"，缺一个字段、少一段说明照样绿
 * （C-G 就是 18 个用例全过、用户仍说"差距很大"）。这里改比 **aria 角色 + 可及名称** 的集合，
 * 它既是键盘/读屏用户真正拿到的东西，也是"信息量"的可量化代理。
 *
 * 输出：harness/snapshot/fidelity/<flow>.{piweb,evopi}.json
 * 用法：PI_PARITY_CWD=<cwd> node <run>/harness/fidelity.mjs [--flow shell] [--side evo|piweb|both]
 * `--side evo` 只重拍 evo-pi 并复用上次的 pi-web 快照（参照系不每次重拍）
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from '@playwright/test'

const PIWEB = process.env.PIWEB_BASE ?? 'http://127.0.0.1:30141'
const EVOPI = process.env.EVOPI_BASE ?? 'http://127.0.0.1:30041'
const cwd = process.env.PI_PARITY_CWD ?? process.cwd()
const outDir = resolve(import.meta.dirname, 'snapshot/fidelity')
const out = (name, side) => `${outDir}/${name}.${side}.json`

/** 采集：每个可交互/可读元素 → {role, name, depth, state, region, visible, keys}。
 *  名称取 aria-label / 文本前 80 字；region/visible/keys 是阶段 2 新增的三个对比维度。
 */
async function capture(page, scope, contains = null) {
  // 采集窗口：pi-web 只渲染尾部、evo-pi 从头渲染，不截同一段就是"左边最后一条 vs 右边第一条"
  // （18 vs 18 却覆盖率 0 已实测过一次）。给 flow 传 tail 时只取最后 N 个。
  const debug = process.env.DEBUG_FIDELITY === '1'
  if (debug) {
    const count = await page.locator(scope).count()
    console.log(`[fidelity][debug] scope=${scope} 命中 ${count} 个；url=${page.url().slice(0, 80)}`)
  }
  return page.evaluate(
    ({ scopeSel, containsSrc }) => {
      const match = containsSrc ? new RegExp(containsSrc) : null
    // 角色/标签 → 人认得的区域名（两边 DOM 约定不同，不归一就没法比"哪个区缺什么"）
    const ZONE = {
      complementary: '侧栏',
      banner: '顶栏',
      main: '主区',
      navigation: '导航',
      tabpanel: '主区',
      dialog: '弹窗',
      aside: '侧栏',
      header: '顶栏',
      nav: '导航',
      section: '区域',
      region: '区域',
    }
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
        // 归属区域：最近的、带 zone 语义的祖先——没有它，两边的"同名元素"可能分属不同区域，
        // 数量对上也是假对上（C-G 那轮就这么漏过一版）。
        const regionOf = (n) => {
          let cur = n.parentElement
          while (cur) {
            const tag2 = cur.tagName?.toLowerCase()
            const r2 = cur.getAttribute?.('role')
            if (
              cur.dataset?.zone ||
              cur.dataset?.component ||
              cur.dataset?.section ||
              ['complementary', 'banner', 'main', 'navigation', 'tabpanel', 'dialog', 'region'].includes(r2) ||
              ['header', 'aside', 'main', 'nav', 'section'].includes(tag2)
            )
              return (
                cur.dataset?.zone ||
                cur.dataset?.component ||
                cur.dataset?.section ||
                ZONE[r2] ||
                ZONE[tag2] ||
                r2 ||
                tag2
              )
            cur = cur.parentElement
          }
          return null
        }
        // 可见性：display:none / 尺寸为 0 的元素不该算"有"（MCP 弹窗里隐藏的历史节点曾把两边计数都放大）
        const rect = el.getBoundingClientRect()
        const visible = rect.width > 0 && rect.height > 0
        // 区域兜底用几何：两边的 DOM 约定不一样，靠语义祖先只能覆盖一半；
        // 位置是"用户看到的区域"，比 role 更接近事实（pi-web 有一堆无语义 div）。
        const zoneByGeometry = () => {
          if (!visible) return null
          if (rect.top < 56) return '顶栏'
          if (rect.left + rect.width / 2 < 320) return '侧栏'
          if (rect.left > window.innerWidth - 560) return '右栏'
          return '主区'
        }
        // 键盘绑定：明确声明的快捷键要单列（快捷键是最容易"看着有其实没绑"的一项）
        const keys =
          el.getAttribute('aria-keyshortcuts') ??
          (el.getAttribute('data-hotkey') || null) ??
          null
        if (keep && name)
          out.push({
            role: role ?? tag,
            name,
            depth,
            state: states,
            region: regionOf(el) ?? zoneByGeometry(),
            visible,
            keys,
          })
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


/**
 * 按"消息块"采集：每条消息一条 {hash, anchors}。
 *
 * 为什么需要它：会话面两侧的**渲染窗口宽度不同**（pi-web 懒加载 N 条、evo-pi 全量），
 * 按 DOM 序号截尾部永远错位——实测 18/18、24/24 都是 0% 覆盖率。
 * 对齐只能按内容：给每条消息算一个归一化文本哈希，从尾部找最长的共同后缀，
 * 再比那段里的可及元素。
 */
async function captureBlocks(page, scope) {
  return page.evaluate((sel) => {
    const norm = (text) => text.replace(/\s+/g, ' ').trim()
    // FNV-1a 32 位：够用且不引依赖（这里只做相等比较）
    const hash = (text) => {
      let h = 0x811c9dc5
      for (let i = 0; i < text.length; i += 1) {
        h ^= text.charCodeAt(i)
        h = Math.imul(h, 0x01000193) >>> 0
      }
      return h.toString(16)
    }
    const SEMANTIC = new Set(['H1', 'H2', 'H3', 'H4', 'LI', 'TH', 'TD', 'BUTTON', 'A', 'PRE', 'CODE', 'TABLE'])
    return [...document.querySelectorAll(sel)].map((root) => {
      const anchors = []
      const walk = (node, depth) => {
        for (const el of node.children) {
          if (SEMANTIC.has(el.tagName)) {
            const rect = el.getBoundingClientRect()
            if (rect.width > 0 && rect.height > 0) {
              const label =
                (el.getAttribute('aria-label') || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80)
              if (label) anchors.push(`${el.tagName.toLowerCase()}:${label}`)
            }
          }
          walk(el, depth + 1)
        }
      }
      walk(root, 0)
      return { hash: hash(norm(root.textContent || '')), textLen: norm(root.textContent || '').length, anchors }
    })
  }, scope)
}

/** 取两侧最长共同后缀（按消息哈希），返回 [{piStart, evoStart, count}] */
function alignBlocks(piBlocks, evoBlocks) {
  const max = Math.min(piBlocks.length, evoBlocks.length, 30)
  for (let k = max; k > 0; k -= 1) {
    const tail = piBlocks.slice(-k).map((b) => b.hash)
    for (let start = evoBlocks.length - k; start >= 0; start -= 1) {
      const slice = evoBlocks.slice(start, start + k).map((b) => b.hash)
      if (slice.join(',') === tail.join(',')) {
        return { piStart: piBlocks.length - k, evoStart: start, count: k }
      }
    }
  }
  return null
}

async function shot(browser, url, open, scope, contains = null, tail = 0, align = false) {
  // 视口要够大：chat 用懒加载，视口太小时消息区元素全在视口外，可见性过滤会把它们全丢掉
  const page = await browser.newPage({ locale: 'zh-CN', viewport: { width: 1500, height: 1600 } })
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  if (open) await open(page)
  const all = await capture(page, scope, contains)
  // 取尾部同一段：pi-web 懒加载只渲染最后几条、evo-pi 从头渲染，
  // 不截同一段就会"18 vs 18 但覆盖率 0"（实测过）。
  const entries = tail > 0 ? all.slice(-tail) : all
  const blocks = align ? await captureBlocks(page, scope) : null
  const text = entries.length
    ? (await page.locator(scope ?? 'body').filter({ hasText: contains ?? /.*/ }).first().innerText())
        .replace(/\s+/g, ' ')
        .trim()
    : ''
  await page.close()
  // 采集自检：抓到空快照比抓错更危险（门会读成"零缺口"或"缺一侧"）。
  // 消息块少于 3 条、或全部块的锚点加起来是 0 个，直接失败，别写盘。
  if (blocks) {
    const anchorCount = blocks.reduce((n, b) => n + (b.anchors?.length ?? 0), 0)
    if (blocks.length < 3 || anchorCount === 0)
      throw new Error(
        `采集结果不可用：块 ${blocks.length} 条、锚点 ${anchorCount} 个（scope=${scope}）——先修选择器再采`,
      )
  }

  return { capturedAt: new Date().toISOString(), url, entries, blocks, textLength: text.length, text }
}


/** 流程定义：每一步都写明"打开什么、等什么、拍哪块" */
// 夹具用**合成**长会话（65 行），不再用真实会话 id：
// 那个 id（01a15c4c…）是从本机 ~/.pi/agent 拷来的真实会话，采进快照等于把用户对话入库。
const SESSION_ID = process.env.PI_PARITY_SESSION ?? '01jclongsession0000000000001'


/**
 * 把采集范围内的滚动容器统一拨到底部。
 *
 * 为什么必须做：pi-web 只渲染尾部（懒加载），evo-pi 从头渲染；不统一位置时
 * 采到的就是"左边最后一条、右边第一条"，覆盖率恒为 0——已经踩过一次。
 */
async function scrollToBottom(page, selector) {
  // 用 try/catch 包住：采集步骤不该因为"这一页没有滚动容器"就整体失败
  // （上一版没包，页面在极短内容下 evaluate 抛错 → 快照写成空数组，覆盖率恒 0）
  try {
    await page.evaluate((sel) => {
    const target = document.querySelector(sel)
    if (!target) return
    let node = target
    while (node && node !== document.body) {
        const style = getComputedStyle(node)
        if (/(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight + 4) {
          node.scrollTop = node.scrollHeight
          return
        }
        node = node.parentElement
      }
      window.scrollTo(0, document.documentElement.scrollHeight)
    }, selector)
  } catch (error) {
    console.warn(`[fidelity] 滚动到顶部失败（继续采集）：${String(error).slice(0, 80)}`)
  }
  await page.waitForTimeout(900)
}

const FLOWS = {
  // 会话面：两边打开同一个真实长会话，比"消息区里的可及元素"
  chat: {
    align: true,
    pi: {
      // pi-web 只有 `/` 一个页面，会话与 cwd 都走查询参数（lib/initial-navigation.ts:18）
      // 用 `?cwd=` 进（会话靠点侧栏链接进入，见 open）
      url: () => `${PIWEB}/?cwd=${encodeURIComponent(cwd)}`,
      // 消息行：`ChatWindow.tsx:1175` 给每条消息套了 `<div data-entry-id=…>`；
      // 之前用 `.markdown-body` 会命中无关的小节点（实测每块只抓到 14 字、锚点全空）。
      scope: '[data-entry-id]',
      tail: 24,
      contains: /./,
      open: async (page) => {
        // 之前靠写 sessionStorage（`pi-web:tab-open-session`）+ reload 让 pi-web 自动恢复会话，
        // 实测在 headless 里不生效（侧栏拿不到 cwd，永远停在占位页，采到 0 个元素）。
        // 改成**点侧栏里的会话链接**——这条路是用户真实路径，也稳：
        // 侧栏渲染出 `a[href*="<sessionId>"]` 后点它即可（实测 73 条消息）。
        const link = page.locator(`a[href*="${SESSION_ID}"], [data-session-id="${SESSION_ID}"]`).first()
        await link.waitFor({ state: 'visible', timeout: 20000 })
        await link.click()
        // 会话打开后还要等消息渲染 + 懒加载补齐
        await page.waitForTimeout(6000)
        await scrollToBottom(page, '.markdown-body')
      },
    },
    evo: {
      url: () => `${EVOPI}/?cwd=${encodeURIComponent(cwd)}&session=${SESSION_ID}`,
      // 消息行：`message-item.tsx` 的 `<article data-message-id=…>`（与 pi 侧 data-entry-id 同层级）
      scope: '[data-message-id]',
      tail: 24,
      contains: /./,
      open: async (page) => {
        await page.waitForTimeout(6000)
        await scrollToBottom(page, '[data-testid="chat-scroll"]')
      },
    },
  },
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
        // 壳的「文件」页签也要拍：它是壳的一部分（pi-web 的文件区一直显示在侧栏里）
        const filesTab = page.getByRole('tab', { name: /文件/ })
        if (await filesTab.count()) await filesTab.first().click()
        await page.waitForTimeout(1200)
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

// 只拍一侧：`--side evo` 时复用上次落盘的 pi-web 快照。
// 理由：pi-web 是参照系，它的快照只有在夹具或参照实现变化时才需要重拍；
// 每次改完 evo-pi 都去起两个服务（还带信任流程）纯属浪费。
const side = process.argv.includes('--side')
  ? process.argv[process.argv.indexOf('--side') + 1]
  : 'both'
if (!['both', 'evo', 'piweb'].includes(side)) {
  console.error(`未知 --side ${side}，可用：both | evo | piweb`)
  process.exit(2)
}

const browser = await chromium.launch()
const pi =
  side === 'evo'
    ? JSON.parse(readFileSync(out(flowName, 'piweb'), 'utf8'))
    : await shot(browser, flow.pi.url(), flow.pi.open, flow.pi.scope, flow.pi.contains, flow.pi.tail ?? 0, Boolean(flow.align))
const evo =
  side === 'piweb'
    ? JSON.parse(readFileSync(out(flowName, 'evopi'), 'utf8'))
    : await shot(browser, flow.evo.url(), flow.evo.open, flow.evo.scope, flow.evo.contains, flow.evo.tail ?? 0, Boolean(flow.align))
await browser.close()

// 快照要在**对齐之后**再写盘：否则门读到的是未对齐的原始 entries，
// 会拿"窗口外的消息"当缺口（实测报了 26 条假缺口）
mkdirSync(outDir, { recursive: true })
if (side !== 'evo') writeFileSync(out(flowName, 'piweb'), `${JSON.stringify(pi, null, 2)}\n`)
if (side !== 'piweb') writeFileSync(out(flowName, 'evopi'), `${JSON.stringify(evo, null, 2)}\n`)

const nameOf = (e) => `${e.role}:${e.name}`
// 有 blocks 的 flow 走"按消息内容对齐"：先用哈希找共同后缀，再只比那段里的锚点
let aligned = null
if (Array.isArray(pi.blocks) && Array.isArray(evo.blocks) && pi.blocks.length && evo.blocks.length) {
  aligned = alignBlocks(pi.blocks, evo.blocks)
  if (aligned) {
    pi.entries = pi.blocks.slice(aligned.piStart).flatMap((b) => b.anchors).map((n) => {
      const [role, ...rest] = n.split(':')
      return { role, name: rest.join(':') }
    })
    evo.entries = evo.blocks.slice(aligned.evoStart, aligned.evoStart + aligned.count).flatMap((b) => b.anchors).map((n) => {
      const [role, ...rest] = n.split(':')
      return { role, name: rest.join(':') }
    })
    console.log(`[${flowName}] 已按消息内容对齐：共同后缀 ${aligned.count} 条消息（pi 起点 ${aligned.piStart}，evo 起点 ${aligned.evoStart}）`)
  } else {
    // 对齐失败就退到"整段消息集合"比较：两侧跑的是同一个夹具，
    // 比消息内容对齐更稳（pi-web 会按可见窗口懒加载，尾块常常对不上）。
    const toEntry = (n) => {
      const [role, ...rest] = n.split(':')
      return { role, name: rest.join(':') }
    }
    pi.entries = pi.blocks.flatMap((b) => b.anchors).map(toEntry)
    evo.entries = evo.blocks.flatMap((b) => b.anchors).map(toEntry)
    console.log(
      `[${flowName}] ⚠ 消息块未对齐（pi ${pi.blocks.length} 块 / evo ${evo.blocks.length} 块），退到整段集合比较`,
    )
  }
}
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
