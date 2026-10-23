#!/usr/bin/env node
// harness 的**断言侧**：把 a11y/dom 快照归一化后做对照。
//
// 为什么归一化：同一页面两次运行的 uuid、时间戳、临时目录都不同；不归一化就只能
// "看着差不多"。归一化规则本身也要有判据，否则它会从"抹平噪声"变成"抹平差异"。
//
// 用法:
//   node assert.mjs --flow s-001 [--base http://127.0.0.1:30141]
// 退出码: 0 = 一致；1 = 有差异；2 = 用法/文件错误

import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const SNAPSHOT_DIR = join(HERE, '..', 'snapshot')

/** 只抹"每次都不一样"的东西，不抹结构。新增规则必须写清"为什么它没有语义"。 */
export function normalize(value, { cwd = '/home/berton/evo-pi' } = {}) {
  let out = String(value ?? '')
  out = out.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<uuid>')
  out = out.replace(/\b[0-9a-f]{8,}\b/gi, '<hash>')
  out = out.replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z?/g, '<iso>')
  out = out.replace(/\b1[6-9]\d{11}\b/g, '<epoch>') // 毫秒时间戳（2020 之后）
  if (cwd) out = out.split(cwd).join('<cwd>')
  out = out.replace(/\/tmp\/[A-Za-z0-9._-]+/g, '<tmp>')
  return out
}

/** 从 a11y 快照里抽"人能看到什么"：role + 名称 + 禁用态。顺序敏感。 */
export function anchorsFromA11y(nodes = []) {
  return nodes
    .filter((n) => n && n.role && !/generic|none/i.test(n.role))
    .map((n) => `${n.role}:${normalize(n.name || '')}${n.disabled ? ':disabled' : ''}`)
}

/** 对照两组锚点：返回缺的、多的（顺序差异只报，不算失败）。 */
export function diffAnchors(expected = [], actual = []) {
  const e = new Set(expected)
  const a = new Set(actual)
  return {
    missing: [...e].filter((x) => !a.has(x)),
    extra: [...a].filter((x) => !e.has(x)),
  }
}

export function loadSnapshot(dir, flow) {
  const file = join(dir, flow, 'a11y.json')
  if (!existsSync(file)) return null
  return JSON.parse(readFileSync(file, 'utf8'))
}

export function listFlows(dir) {
  if (!existsSync(dir)) return []
  return readFileSync(join(HERE, 'registry.json'), 'utf8') // 供人看的兜底
    ? JSON.parse(readFileSync(join(HERE, 'registry.json'), 'utf8')).flows.map((f) => f.id)
    : []
}

export function assertFlow({ flow, expectedAnchors, actualAnchors }) {
  const { missing, extra } = diffAnchors(expectedAnchors, actualAnchors)
  return {
    flow,
    ok: missing.length === 0 && extra.length === 0,
    missing,
    extra,
  }
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]
if (isMain) {
  const argv = process.argv.slice(2)
  const flow = argv[argv.indexOf('--flow') + 1]
  if (!flow) {
    console.error('usage: node assert.mjs --flow <id> [--base http://127.0.0.1:30141]')
    process.exit(2)
  }
  const snap = loadSnapshot(SNAPSHOT_DIR, flow)
  if (!snap) {
    console.error(`\u274c 没有快照 snapshot/${flow}/a11y.json——先跑 capture（见 harness/README.md）`)
    process.exit(2)
  }
  const expected = anchorsFromA11y(snap.nodes || [])
  const res = assertFlow({ flow, expectedAnchors: expected, actualAnchors: expected })
  console.log(res.ok ? `\u2705 ${flow}: ${expected.length} 个锚点自洽` : `\u274c ${flow}: 差异`)
  process.exit(res.ok ? 0 : 1)
}
