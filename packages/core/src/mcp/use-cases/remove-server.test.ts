import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import type { McpRepository } from '../domain/ports'
import { createRemoveServer } from './remove-server'

/**
 * T-37 移除一个 server（B-032）。
 *
 * 两个必须钉住的语义：
 * 1. 失败要**原样**把 error 交回调用方——界面靠它决定"清选中"还是"留住不动"；
 * 2. 端口收到的 ref 只带 scope/name——多带字段意味着调用方在替端口做决定。
 */
describe('createRemoveServer', () => {
  const calls: Array<{ ref: { scope: string; name: string }; cwd: string | null }> = []
  let outcome: { ok: boolean; error?: unknown } = { ok: true }

  const repository: McpRepository = {
    list: async () => ({ ok: true, value: [] }),
    write: async () => ({ ok: true }),
    add: async () => ({ ok: true, value: { servers: [] } }),
    remove: async (ref, cwd) => {
      calls.push({ ref: { scope: ref.scope, name: ref.name }, cwd })
      return outcome as never
    },
  }

  const remove = createRemoveServer({ repository })

  beforeEach(() => {
    calls.length = 0
    outcome = { ok: true }
  })

  it('T-37 成功：把 scope/name 与 cwd 原样交给端口', async () => {
    const res = await remove.remove(
      { scope: 'project', name: 'gamma', enabled: true, transport: 'stdio' } as never,
      '/tmp/proj',
    )
    expect(res.ok).toBe(true)
    expect(calls).toEqual([{ ref: { scope: 'project', name: 'gamma' }, cwd: '/tmp/proj' }])
    // 没给端口塞多余字段（positional 之外的任何东西都是调用方越权）
    expect(Object.keys(calls[0]?.ref ?? {})).toEqual(['scope', 'name'])
  })

  it('T-37 失败：error 原样回传，不吞不改写', async () => {
    const err = { code: 'notFound', message: '没有这个 server' }
    outcome = { ok: false, error: err }
    const res = await remove.remove(
      { scope: 'user', name: 'alpha', enabled: true, transport: 'stdio' } as never,
      null,
    )
    expect(res.ok).toBe(false)
    expect(res.error).toBe(err)
  })
})

describe('removeServer（真实文件）', () => {
  it('T-37 删掉指定条目，保留其它条目；找不到时不抛错', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'mcp-remove-'))
    process.env.PI_CODING_AGENT_DIR = dir
    const file = join(dir, 'mcp.json')
    writeFileSync(
      file,
      JSON.stringify({
        mcpServers: { alpha: { command: 'a' }, beta: { command: 'b' } },
      }),
    )
    const { removeServer } = await import('../infrastructure/mcp-config')
    removeServer('user', 'alpha', null)
    expect(JSON.parse(readFileSync(file, 'utf8')).mcpServers).toEqual({ beta: { command: 'b' } })
    // 幂等：再删一次不抛错
    expect(() => removeServer('user', 'alpha', null)).not.toThrow()
  })
})
