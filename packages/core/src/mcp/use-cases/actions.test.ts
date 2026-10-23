import { describe, expect, it } from 'vitest'
import { fail, type McpServerRef, type McpTestResult, type Outcome, ok } from '../domain/mcp-types'
import type { McpRepository, McpTestRunner } from '../domain/ports'
import { batchSummary, createBatchActions } from './batch-actions'
import { createTestCoordinator } from './test-server'
import { createToggleServer, withServerState } from './toggle-server'

const ref = (name: string, scope: 'user' | 'project' = 'user'): McpServerRef => ({ scope, name })

function writeAnswers(answers: Record<string, Outcome<void>>): McpRepository {
  return {
    list: async () => ok([]),
    write: async (r) => answers[`${r.scope}/${r.name}`] ?? ok(undefined),
    add: async () => ok({ servers: [] }),
    remove: async () => ok(undefined),
  }
}

describe('D-B-03 toggle-server', () => {
  it('T-07 成功返回 ok', async () => {
    const toggle = createToggleServer({ repository: writeAnswers({ 'user/a': ok(undefined) }) })
    expect((await toggle(ref('a'), true, null)).ok).toBe(true)
  })

  it('T-07 失败原样返回，且把需要信任翻译成 trustRequired', async () => {
    const toggle = createToggleServer({
      repository: writeAnswers({ 'user/a': fail({ code: 'untrusted', message: 'trust first' }) }),
    })
    const result = await toggle(ref('a'), true, null)
    expect(result.ok).toBe(false)
    expect(result.trustRequired).toBe(true)
  })

  it('T-07 withServerState 只改目标条目（回滚用）', () => {
    const list = [
      { scope: 'user' as const, name: 'a', enabled: true, transport: 'stdio', sourcePath: '/a' },
      { scope: 'user' as const, name: 'b', enabled: true, transport: 'stdio', sourcePath: '/b' },
    ]
    expect(withServerState(list, ref('a'), false).map((s) => s.enabled)).toEqual([false, true])
  })
})

describe('D-B-04 batch-actions', () => {
  it('T-08 部分失败逐条记账，成功的保留', async () => {
    const batch = createBatchActions({
      repository: writeAnswers({
        'user/a': ok(undefined),
        'user/b': fail({ code: 'internal', message: 'nope' }),
        'user/c': fail({ code: 'password-variable', message: 'PI_WEB_PASSWORD' }),
      }),
    })
    const outcome = await batch([ref('a'), ref('b'), ref('c')], true, null)
    const summary = batchSummary(outcome)
    expect(summary.okCount).toBe(1)
    expect(summary.failedKeys).toEqual(['user/b'])
    expect(summary.skippedKeys).toEqual(['user/c'])
  })

  it('T-08 组头文案能区分失败与跳过', async () => {
    const batch = createBatchActions({
      repository: writeAnswers({ 'user/c': fail({ code: 'password-variable', message: 'x' }) }),
    })
    const outcome = await batch([ref('c')], true, null)
    expect(outcome.failed).toHaveLength(0)
    expect(outcome.skipped).toHaveLength(1)
  })
})

describe('D-B-02 test-server', () => {
  it('T-09 同一台连点只发一次请求', async () => {
    let calls = 0
    const runner: McpTestRunner = {
      run: async (): Promise<Outcome<McpTestResult>> => {
        calls += 1
        await new Promise((r) => setTimeout(r, 5))
        return ok({ ok: true, tools: ['t'] })
      },
    }
    const coordinator = createTestCoordinator({ runner })
    const [a, b] = await Promise.all([
      coordinator.test(ref('a'), null),
      coordinator.test(ref('a'), null),
    ])
    expect(calls).toBe(1)
    expect(a.ok && b.ok).toBe(true)
  })

  it('T-09 不同服务器可以并发', async () => {
    const seen: string[] = []
    const runner: McpTestRunner = {
      run: async (r) => {
        seen.push(r.name)
        return ok({ ok: true })
      },
    }
    const coordinator = createTestCoordinator({ runner })
    await Promise.all([coordinator.test(ref('a'), null), coordinator.test(ref('b'), null)])
    expect(seen.sort()).toEqual(['a', 'b'])
    expect(coordinator.inFlight()).toEqual([])
  })
})
