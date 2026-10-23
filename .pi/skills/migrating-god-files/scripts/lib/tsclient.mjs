// 极简 tsserver 客户端——让「符号全集」不再依赖 agent 的编辑器会话。
//
// 为什么需要它：
//   试点第一轮，C1 的 `lspSource` 门只认 state.json 里一个自己填的字符串 'LSP'，
//   而真实的 TypeScript 语言服务根本没起来（项目里是 TS 7 原生发行版，没有 tsserver.js）。
//   于是 175 条声明冒充 390 条，`symbols` 门全绿——分数好看，分母是错的。
//   `code_resolve` 是 agent 侧工具，脚本/CI 调不到；要机器可验证，就必须自己会说话。
//
// 协议：tsserver 用按行分隔的 JSON（`{seq,type:"request",command,arguments}`），
// 响应带 `request_seq`。这里只实现本技能用到的三条：open / navtree / projectInfo。
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const DEFAULT_TIMEOUT_MS = 20_000

/** 从 .pi/supi/config.json 或全局 npm 里找 tsserver.js；找不到返回 null */
export function resolveTsserver({ root = process.cwd() } = {}) {
  const cfg = join(root, '.pi/supi/config.json')
  if (existsSync(cfg)) {
    try {
      const j = JSON.parse(readFileSync(cfg, 'utf8'))
      const p = j?.lsp?.servers?.typescript?.initializationOptions?.tsserver?.path
      if (p && existsSync(p)) return p
    } catch {
      // 配置坏了就当没有——下面还会走全局探测
    }
  }
  const npmRoot = spawnSync('npm', ['root', '-g'], { encoding: 'utf8' })
  if (npmRoot.status === 0) {
    const p = join(npmRoot.stdout.trim(), 'typescript/lib/tsserver.js')
    if (existsSync(p)) return p
  }
  return null
}

/** tsserver.js 所属 typescript 包的版本 + 是否带 createLanguageService */
export function tsserverInfo(tsserverPath) {
  if (!tsserverPath) return null
  const dir = tsserverPath.replace(/\/lib\/tsserver\.js$/, '')
  const pkg = join(dir, 'package.json')
  const version = existsSync(pkg) ? JSON.parse(readFileSync(pkg, 'utf8')).version : 'unknown'
  let hasLanguageService = false
  try {
    // 只用 require 探测 API 是否存在，不真跑（原生版会没有这个函数）
    const mod = spawnSync(
      process.execPath,
      ['-e', `const t=require(${JSON.stringify(dir)});console.log(typeof t.createLanguageService)`],
      { encoding: 'utf8' },
    )
    hasLanguageService = (mod.stdout || '').trim() === 'function'
  } catch {
    hasLanguageService = false
  }
  return {
    path: tsserverPath,
    dir,
    version,
    hasLanguageService,
    major: Number(version.split('.')[0]),
  }
}

export class TsClient {
  static async open({ tsserverPath, cwd = process.cwd(), timeoutMs = DEFAULT_TIMEOUT_MS }) {
    const client = new TsClient(tsserverPath, cwd, timeoutMs)
    await client.start()
    return client
  }

  constructor(tsserverPath, cwd, timeoutMs) {
    this.tsserverPath = tsserverPath
    this.cwd = cwd
    this.timeoutMs = timeoutMs
    this.seq = 0
    this.pending = new Map()
    this.buffer = ''
    this.projects = []
  }

  start() {
    this.child = spawn(process.execPath, [this.tsserverPath], { cwd: this.cwd })
    this.child.stdout.on('data', (d) => this.onData(d))
    this.child.stderr.on('data', () => {})
    // tsserver 起来后会主动推 events；等到第一条响应即可（open 会触发 project load）
    return Promise.resolve()
  }

  onData(chunk) {
    this.buffer += chunk.toString()
    const parts = this.buffer.split('\n')
    this.buffer = parts.pop() ?? ''
    for (const line of parts) {
      if (!line.trim()) continue
      let msg
      try {
        msg = JSON.parse(line)
      } catch {
        continue
      }
      if (msg.type === 'response' && this.pending.has(msg.request_seq)) {
        this.pending.get(msg.request_seq)(msg)
        this.pending.delete(msg.request_seq)
      } else if (msg.type === 'event' && msg.event === 'projectLoadingStart') {
        this.projects.push(msg.body?.projectName)
      }
    }
  }

  request(command, args) {
    this.seq += 1
    const seq = this.seq
    const payload = { seq, type: 'request', command, arguments: args }
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(seq)
        reject(new Error(`tsserver ${command} 超时（${this.timeoutMs}ms）`))
      }, this.timeoutMs)
      this.pending.set(seq, (msg) => {
        clearTimeout(timer)
        resolve(msg)
      })
      this.child.stdin.write(`${JSON.stringify(payload)}\n`)
    })
  }

  async openFile(file) {
    await this.request('open', { file, projectRootPath: this.cwd })
    return file
  }

  async projectInfo(file) {
    const res = await this.request('projectInfo', { file })
    return res.body ?? null
  }

  async navTree(file) {
    const res = await this.request('navtree', { file })
    return res.body ?? null
  }

  close() {
    try {
      this.child.stdin.end()
      this.child.kill()
    } catch {
      // 已经退出就没什么可做的
    }
  }
}

/**
 * 把 NavigationTree 摊平成符号表。
 * 坑：根节点的 text 是 ''、kind 是 'script'，且同名符号可以出现在多个容器里——
 * 只按名字去重会把 `SkillDetail` 里的两次出现合并，行号指到别处。
 */
export function flattenNavTree(root) {
  const out = []
  const walk = (node, container) => {
    if (!node) return
    const isFile = node.text === '' || node.kind === 'script' || node.kind === 'module'
    if (!isFile && node.text) {
      const span = node.spans?.[0] ?? node.nameSpan ?? null
      out.push({
        name: node.text,
        kind: node.kind,
        container: container || null,
        line: span?.start?.line ?? null,
        col: span?.start?.offset ?? null,
      })
    }
    const nextContainer = isFile ? container : node.text
    for (const child of node.childItems ?? []) walk(child, nextContainer)
  }
  walk(root, null)
  return out
}

/** 符号的自然键：容器名 + 名字 + 行号（同名不同位置必须区分开） */
export const symbolKey = (s) => `${s.container ?? ''}.${s.name}@${s.line ?? '?'}`
