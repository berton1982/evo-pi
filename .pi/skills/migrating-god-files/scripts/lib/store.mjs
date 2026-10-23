// 状态文件与文件指纹的读写原语。
// 为什么单独一层：state.mjs / check-phase.mjs 都要读同一份 state.json，
// 如果各自实现一遍读取与校验，两份实现的漂移会先于阶段漂移出现。

import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

export const STATE_FILE = 'state.json'

export function sha1File(p) {
  return createHash('sha1').update(readFileSync(p)).digest('hex')
}

// 与 `wc -l` 对齐：以换行符计数，末行无换行时不计。
export function countLines(p) {
  const text = readFileSync(p, 'utf8')
  if (!text.length) return 0
  const nl = (text.match(/\n/g) || []).length
  return text.endsWith('\n') ? nl : nl + 1
}

export function readText(p) {
  return existsSync(p) ? readFileSync(p, 'utf8') : null
}

export function ensureDir(p) {
  mkdirSync(p, { recursive: true })
}

export function readState(runDir) {
  const p = resolve(runDir, STATE_FILE)
  if (!existsSync(p)) {
    const err = new Error(`没有 ${p}——先跑 state.mjs init`)
    err.code = 'ENOSTATE'
    throw err
  }
  return JSON.parse(readFileSync(p, 'utf8'))
}

// 原子写：先写临时文件再 rename，避免中途崩溃留下半份 state.json。
export function writeState(runDir, state) {
  state.updatedAt = new Date().toISOString()
  const p = resolve(runDir, STATE_FILE)
  ensureDir(dirname(p))
  const tmp = `${p}.tmp`
  writeFileSync(tmp, `${JSON.stringify(state, null, 2)}\n`)
  renameSync(tmp, p)
  return state
}
