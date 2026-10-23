#!/usr/bin/env node
/**
 * 双开对账：同一 agentDir 下，pi-web(30141) 与 evo-pi(30041) 的 MCP 数据面逐字段比较。
 *
 * 为什么不只比 UI：C6 要的是"同一个脚本、同一份夹具，两边结论一致"。
 * UI 断言（e2e）只能证明"按我们的预期动了"，数据面比较才证明"两边看到的是同一件事"。
 *
 * 用法：PI_PARITY_CWD=<cwd> node .evo/migration/<run>/harness/parity.mjs
 * 退出码：0 全部一致；1 有差异（差异写进 snapshot/parity.json，由 parity.md 分类）
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const PIWEB = process.env.PIWEB_BASE ?? 'http://127.0.0.1:30141'
const EVOPI = process.env.EVOPI_BASE ?? 'http://127.0.0.1:30041'
const out = resolve(import.meta.dirname, 'snapshot/parity.json')

const normScope = (s) => (s === 'global' ? 'user' : s)
const key = (s) => `${s.scope}/${s.name}`

async function getJson(url, init) {
  const res = await fetch(url, init)
  const text = await res.text()
  try {
    return { status: res.status, body: JSON.parse(text) }
  } catch {
    return { status: res.status, body: { raw: text.slice(0, 200) } }
  }
}

const piList = await getJson(`${PIWEB}/api/mcp`)
const evoList = await getJson(`${EVOPI}/api/mcp`)
const piServers = (piList.body?.servers ?? []).map((s) => ({
  key: key({ scope: normScope(s.scope), name: s.name }),
  enabled: s.enabled,
  transport: s.transport,
}))
const evoServers = (evoList.body?.servers ?? []).map((s) => ({
  key: key(s),
  enabled: s.enabled,
  transport: s.transport,
}))

const diffs = []
const piKeys = new Set(piServers.map((s) => s.key))
const evoKeys = new Set(evoServers.map((s) => s.key))
for (const k of piKeys) if (!evoKeys.has(k)) diffs.push({ kind: 'only-piweb', key: k })
for (const k of evoKeys) if (!piKeys.has(k)) diffs.push({ kind: 'only-evopi', key: k })
for (const a of piServers) {
  const b = evoServers.find((s) => s.key === a.key)
  if (!b) continue
  if (a.enabled !== b.enabled)
    diffs.push({ kind: 'enabled-mismatch', key: a.key, piweb: a.enabled, evopi: b.enabled })
  if (a.transport !== b.transport)
    diffs.push({ kind: 'transport-mismatch', key: a.key, piweb: a.transport, evopi: b.transport })
}

// 指令面：stdio server 的可用性检查（真起进程，最能暴露实现差异）
const tests = []
for (const s of evoServers.filter((s) => s.transport === 'stdio')) {
  const [scope, name] = s.key.split('/')
  const pi = await getJson(`${PIWEB}/api/mcp/test`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ scope: scope === 'user' ? 'global' : scope, name }),
  })
  const evo = await getJson(`${EVOPI}/api/mcp/test`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ scope, name }),
  })
  const piOk = pi.body?.result?.state === 'connected'
  const evoOk = evo.body?.ok === true
  const row = {
    key: s.key,
    piweb: { ok: piOk, tools: (pi.body?.result?.tools ?? []).map((t) => t.name) },
    evopi: { ok: evoOk, tools: evo.body?.tools ?? [] },
  }
  tests.push(row)
  if (piOk !== evoOk) diffs.push({ kind: 'test-verdict-mismatch', key: s.key, ...row })
  else if (JSON.stringify(row.piweb.tools) !== JSON.stringify(row.evopi.tools))
    diffs.push({ kind: 'test-tools-mismatch', key: s.key, ...row })
}

const report = {
  generatedAt: new Date().toISOString(),
  cwd: process.env.PI_PARITY_CWD ?? null,
  servers: { piweb: piServers.length, evopi: evoServers.length, matched: piServers.length - diffs.filter((d) => d.kind.startsWith('only')).length },
  fieldRichness: {
    piweb: Object.keys(piList.body?.servers?.[0] ?? {}),
    evopi: Object.keys(evoList.body?.servers?.[0] ?? {}),
    piwebTopLevel: Object.keys(piList.body ?? {}),
    evopiTopLevel: Object.keys(evoList.body ?? {}),
  },
  tests,
  diffs,
}
mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`)

console.log(`服务器：pi-web ${piServers.length} / evo-pi ${evoServers.length}，差异 ${diffs.length} 条`)
for (const d of diffs) console.log(' -', d.kind, d.key ?? '')
for (const t of tests)
  console.log(`   测试 ${t.key}: pi-web ${t.piweb.ok ? 'ok' : 'fail'} [${t.piweb.tools}] / evo-pi ${t.evopi.ok ? 'ok' : 'fail'} [${t.evopi.tools}]`)
console.log(`字段：pi-web ${report.fieldRichness.piweb.length} 个 / evo-pi ${report.fieldRichness.evopi.length} 个`)
console.log(`写入 ${out}`)
process.exit(diffs.length === 0 ? 0 : 1)
