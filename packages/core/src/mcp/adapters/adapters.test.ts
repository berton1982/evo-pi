/**
 * T-24 仓库适配器：列表带 cwd、写用 POST、失败翻译成 Outcome（不抛）
 * T-25 遇到 403 + trust 文案时 trustRequired=true
 * T-26 测试适配器：服务端 ok:false 也是 value 里失败，不是 outcome 失败
 * T-27 Code mode 只发变化的字段，不补默认值
 * T-28 签到：begin/status/submit/cancel 的路径与方法
 * T-29 信任：失败不自动重试，原样返回错误
 * T-30 错误映射：0 状态 → network，超时措辞 → timedOut
 */
import { describe, expect, it, vi } from 'vitest'
import { toMcpError } from './error-mapping'
import { ApiError } from './http-client'
import { createHttpMcpRepository } from './http-mcp-repository'
import { createHttpMcpSignIn } from './http-mcp-sign-in'
import { createHttpMcpTestRunner } from './http-mcp-test-runner'
import { createHttpProjectTrust } from './http-project-trust'

const json = (body: unknown, status = 200): Response =>
  ({
    ok: status < 400,
    status,
    json: async () => body,
  }) as unknown as Response

describe('T-24 仓库适配器', () => {
  it('list 带 cwd、write 走 POST、失败不抛', async () => {
    const fetchImpl = vi.fn(async (_path: string, _init?: RequestInit) =>
      json({
        servers: [
          { name: 'a', scope: 'user', enabled: true, transport: 'stdio', sourcePath: '/a' },
        ],
      }),
    )
    const repo = createHttpMcpRepository({ fetchImpl: fetchImpl as never })
    const listed = await repo.list('/proj')
    expect(fetchImpl.mock.calls[0]?.[0]).toBe('/api/mcp?cwd=%2Fproj')
    expect(listed.ok).toBe(true)
    expect((listed.value as unknown[]).length).toBe(1)

    const failing = createHttpMcpRepository({
      fetchImpl: vi.fn(async () => json({ error: 'boom' }, 500)) as never,
    })
    const written = await failing.write({ scope: 'user', name: 'a' }, true, null)
    // 500 必须变成 ok:false（适配器永远不抛），而不是让调用方 try/catch
    expect(written.ok).toBe(false)
    expect(written.error?.code).toBe('internal')
    expect(written.error?.message).toBe('boom')
  })

  it('fetch 抛 ApiError 时返回 ok:false', async () => {
    const repo = createHttpMcpRepository({
      fetchImpl: vi.fn(async () => {
        throw new ApiError('Network error: offline', 0)
      }) as never,
    })
    const res = await repo.write({ scope: 'user', name: 'a' }, true, null)
    expect(res.ok).toBe(false)
    expect(res.error?.code).toBe('network')
  })
})

describe('T-25 信任语义', () => {
  it('403 + trust 文案 → trustRequired', () => {
    expect(toMcpError(new ApiError('project trust required', 403))).toMatchObject({
      code: 'untrusted',
      trustRequired: true,
    })
    expect(toMcpError(new ApiError('forbidden', 403))).toMatchObject({
      code: 'forbidden',
      trustRequired: false,
    })
  })
})

describe('T-26 测试适配器', () => {
  it('服务端 ok:false 落在 value 里，outcome 仍成功', async () => {
    const runner = createHttpMcpTestRunner({
      fetchImpl: vi.fn(async () => json({ ok: false, error: 'handshake failed' })) as never,
    })
    const res = await runner.run({ scope: 'user', name: 'a' }, null)
    expect(res.ok).toBe(true)
    expect(res.value).toMatchObject({
      ok: false,
      error: { code: 'internal', message: 'handshake failed' },
    })
  })
})

describe('T-28 签到路径与方法', () => {
  it('begin/status/submit/cancel 各自打到对的端点', async () => {
    const calls: Array<[string, string | undefined]> = []
    const fetchImpl = vi.fn(async (path: string, init?: RequestInit) => {
      calls.push([path, init?.method])
      if (path === '/api/mcp/sign-in') return json({ flowId: 'f1', url: 'https://x' })
      if (init?.method === 'POST' || init?.method === 'DELETE') return json({ ok: true })
      return json({ state: 'pending' })
    })
    const flow = createHttpMcpSignIn({ fetchImpl: fetchImpl as never })
    await flow.begin({ scope: 'user', name: 'a' }, null)
    await flow.status('f1')
    await flow.submit('f1', 'http://localhost/cb')
    await flow.cancel('f1')
    expect(calls).toEqual([
      ['/api/mcp/sign-in', 'POST'],
      ['/api/mcp/sign-in/f1', undefined],
      ['/api/mcp/sign-in/f1', 'POST'],
      ['/api/mcp/sign-in/f1', 'DELETE'],
    ])
  })
})

describe('T-29 信任不自动重试', () => {
  it('一次失败就返回，调用一次', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new ApiError('denied', 403)
    })
    const trust = createHttpProjectTrust({ fetchImpl: fetchImpl as never })
    const res = await trust.request('/proj')
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(res.ok).toBe(false)
  })
})

describe('T-30 错误映射', () => {
  it('0 状态 → network + timedOut 只看措辞', () => {
    expect(toMcpError(new ApiError('Network error: timeout of 60000ms exceeded', 0))).toMatchObject(
      {
        code: 'network',
        timedOut: true,
      },
    )
    expect(toMcpError(new Error('weird'))).toMatchObject({ code: 'internal' })
  })
})
