/**
 * MCP 配置读写（服务端）。契约见 `.evo/migration/20261022-mig/contracts/wire.md` 的 C-G 段。
 *
 * 只做两件真实的事：读 `~/.pi/agent/mcp.json` 与 `<cwd>/.pi/mcp.json`，把 `disabled` 翻过来。
 * pi-web 的同一份数据由 pi SDK 的 `readMcpOverview` 提供；这里直接读文件，形状对齐
 * `mcpServers[name] = { command?, url?, args?, env?, description?, disabled? }`。
 */

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

export interface McpEntry {
  command?: string
  url?: string
  args?: string[]
  env?: Record<string, string>
  description?: string
  disabled?: boolean
}

export interface McpServerSummary {
  scope: 'user' | 'project'
  name: string
  enabled: boolean
  transport: string
  sourcePath: string
}

/** 契约里 `McpScope` 只有 `user | project`（`contracts/schema.ts:12`）——"全局"在契约里叫 `user`。 */
export function agentDir(): string {
  return process.env.PI_CODING_AGENT_DIR ?? join(homedir(), '.pi', 'agent')
}

export function globalConfigPath(): string {
  return join(agentDir(), 'mcp.json')
}

export function projectConfigPath(cwd: string): string {
  return join(resolve(cwd), '.pi', 'mcp.json')
}

/** 坏文件不抛：读不到就当没有 server，避免整个面板 500 */
function readServers(path: string): Record<string, McpEntry> {
  if (!existsSync(path)) return {}
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as {
      mcpServers?: Record<string, McpEntry>
    }
    return parsed.mcpServers ?? {}
  } catch {
    return {}
  }
}

function transportOf(entry: McpEntry): string {
  if (entry.url) return 'http'
  if (entry.command) return 'stdio'
  return 'unknown'
}

export function listServers(cwd?: string): McpServerSummary[] {
  const out: McpServerSummary[] = []
  const push = (scope: 'user' | 'project', path: string) => {
    for (const [name, entry] of Object.entries(readServers(path)))
      out.push({
        scope,
        name,
        enabled: entry.disabled !== true,
        transport: transportOf(entry),
        sourcePath: path,
      })
  }
  push('user', globalConfigPath())
  if (cwd) push('project', projectConfigPath(cwd))
  return out
}

export function findEntry(
  scope: 'user' | 'project',
  name: string,
  cwd?: string,
): McpEntry | undefined {
  const path = scope === 'project' && cwd ? projectConfigPath(cwd) : globalConfigPath()
  return readServers(path)[name]
}

export function setEnabled(
  scope: 'user' | 'project',
  name: string,
  enabled: boolean,
  cwd?: string,
): string {
  const path = scope === 'project' && cwd ? projectConfigPath(cwd) : globalConfigPath()
  if (!existsSync(path)) throw new Error(`配置文件不存在：${path}`)
  const parsed = JSON.parse(readFileSync(path, 'utf8')) as { mcpServers?: Record<string, McpEntry> }
  const servers = parsed.mcpServers ?? {}
  const entry = servers[name]
  if (!entry) throw new Error(`没有这个 server：${name}`)
  if (enabled) delete entry.disabled
  else entry.disabled = true
  parsed.mcpServers = servers
  writeFileSync(path, `${JSON.stringify(parsed, null, 2)}\n`)
  return path
}

/**
 * 新增一个 server 条目并落盘（`POST /api/mcp` 的 `action: "add"` 用它）。
 *
 * 为什么不复用 `setEnabled`：那条路只有"翻开关"，而"配置里没有这个 server"时用户没有任何
 * 可行操作——页面只能显示空态。空态必须能就地添加，否则新用户第一步就卡住。
 */
export function addServer(
  scope: 'user' | 'project',
  name: string,
  entry: McpEntry,
  cwd?: string,
): string {
  const path = scope === 'user' ? globalConfigPath() : projectConfigPath(cwd ?? process.cwd())
  if (!/^[\w.-]{1,64}$/.test(name)) throw new Error(`server 名字只能用字母数字与 ._-：${name}`)
  if (!entry.command && !entry.url)
    throw new Error('新增 server 必须给 command（stdio）或 url（http）')
  // 整行命令要在这里就拆开，否则 spawn('npx -y pkg') 只会得到一个 ENOENT
  const normalized: McpEntry = entry.command
    ? (() => {
        const { command, args } = parseCommandLine(entry.command)
        return { ...entry, command, args: entry.args?.length ? entry.args : args }
      })()
    : entry
  const config: { mcpServers: Record<string, McpEntry> } = {
    mcpServers: { ...readServers(path), [name]: normalized },
  }
  ensureDir(dirname(path))
  // 原子写：服务端随时可能在读这两份文件，直接覆盖会让读方看到半截 JSON
  const tmp = `${path}.tmp`
  writeFileSync(tmp, `${JSON.stringify(config, null, 2)}\n`)
  renameSync(tmp, path)
  return path
}

/**
 * 移除一个 server 条目（`DELETE /api/mcp` 用它）。
 *
 * 为什么删完还剩空对象也要保留文件：`{"mcpServers":{}}` 与"文件不存在"在 pi-web 那边
 * 语义不同（后者会退回默认/提示配置路径）。保留空对象 = "用户确实清空了"，别替用户做决定。
 * 找不到条目时**不报错**（幂等）：两个标签页同时点移除，第二个不该看到 500。
 */
export function removeServer(scope: 'user' | 'project', name: string, cwd?: string): string {
  const path = scope === 'project' && cwd ? projectConfigPath(cwd) : globalConfigPath()
  if (!existsSync(path)) throw new Error(`配置文件不存在：${path}`)
  const parsed = JSON.parse(readFileSync(path, 'utf8')) as { mcpServers?: Record<string, McpEntry> }
  const servers = parsed.mcpServers ?? {}
  if (servers[name]) {
    delete servers[name]
    parsed.mcpServers = servers
    const tmp = `${path}.tmp`
    writeFileSync(tmp, `${JSON.stringify(parsed, null, 2)}\n`)
    renameSync(tmp, path)
  }
  return path
}

/**
 * 把用户填的整行命令拆成 `command` + `args`。
 *
 * 为什么必须拆：stdio 条目是 `spawn(command, args)`，把 `npx -y @scope/x` 整行塞进 `command`
 * 会得到一个不存在的可执行文件（ENOENT），而错误信息只报"spawn 失败"，用户根本猜不到原因。
 * 支持成对引号，其余按空白切分——够覆盖 `npx -y pkg` / `node /abs/path.js --flag` 这类常见写法。
 */
export function parseCommandLine(line: string): { command: string; args: string[] } {
  const out: string[] = []
  let cur = ''
  let quote: string | null = null
  for (const ch of line.trim()) {
    if (quote) {
      if (ch === quote) quote = null
      else cur += ch
      continue
    }
    if (ch === '"' || ch === "'") {
      quote = ch
      continue
    }
    if (/\s/.test(ch)) {
      if (cur) {
        out.push(cur)
        cur = ''
      }
      continue
    }
    cur += ch
  }
  if (cur) out.push(cur)
  const [command = '', ...args] = out
  return { command, args }
}

export interface StdioTestResult {
  ok: boolean
  tools?: string[]
  durationMs?: number
  error?: { code: string; message: string }
}

/**
 * stdio server 的可用性检查：拉起进程 → `initialize` → `tools/list` → 关掉。
 * 之所以真的起进程而不是"看文件在不在"：`command` 写错、缺依赖、握手超时都只有跑一次才知道。
 */
export async function testStdio(entry: McpEntry, timeoutMs = 8_000): Promise<StdioTestResult> {
  if (!entry.command)
    return { ok: false, error: { code: 'unsupported', message: '只支持 stdio 传输的自动测试' } }
  const started = Date.now()
  const { spawn } = await import('node:child_process')
  const child = spawn(entry.command, entry.args ?? [], {
    env: { ...process.env, ...(entry.env ?? {}) },
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  const send = (id: number, method: string, params: unknown = {}) =>
    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`)
  return await new Promise<StdioTestResult>((settle) => {
    let buffer = ''
    const done = (r: StdioTestResult) => {
      clearTimeout(timer)
      child.kill()
      settle({ durationMs: Date.now() - started, ...r })
    }
    const timer = setTimeout(
      () =>
        done({ ok: false, error: { code: 'timedOut', message: `${timeoutMs}ms 内未完成握手` } }),
      timeoutMs,
    )
    child.on('error', (e) =>
      done({ ok: false, error: { code: 'spawnFailed', message: e.message } }),
    )
    child.stderr.on('data', () => {})
    child.stdout.on('data', (chunk: Buffer) => {
      buffer += chunk.toString()
      for (const line of buffer.split('\n')) {
        if (!line.trim()) continue
        try {
          const msg = JSON.parse(line) as {
            id?: number
            result?: { tools?: Array<{ name?: string; inputSchema?: unknown }> }
          }
          if (msg.id === 1) send(2, 'tools/list')
          if (msg.id === 2) {
            const tools = msg.result?.tools ?? []
            // 与 pi-web 对齐的校验：缺 name 或 inputSchema 的条目说明服务端不合规，
            // 这时报"测试通过"会让用户以为坏了的那台是好的（对照测试实测过这条差异）。
            const bad = tools.find((t) => !t.name || !t.inputSchema)
            if (bad)
              done({
                ok: false,
                error: {
                  code: 'invalidTools',
                  message: 'Invalid entry in MCP tools/list result',
                },
              })
            else done({ ok: true, tools: tools.map((t) => t.name as string) })
          }
        } catch {
          // 不是 JSON 的行（日志）忽略
        }
      }
      buffer = buffer.slice(buffer.lastIndexOf('\n') + 1)
    })
    send(1, 'initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'evo-pi', version: '0.0.0' },
    })
  })
}

export function ensureDir(path: string): void {
  mkdirSync(dirname(path), { recursive: true })
}
