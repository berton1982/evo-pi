import { describe, expect, it } from 'vitest'
import { fail, type McpServerSummary, type Outcome, ok } from '../domain/mcp-types'
import type { McpRepository } from '../domain/ports'
import { createOverviewLoader } from './load-overview'

const servers = (names: string[]): McpServerSummary[] =>
  names.map((name) => ({
    scope: 'user' as const,
    name,
    enabled: true,
    transport: 'stdio',
    sourcePath: `/tmp/${name}`,
  }))

function repoOf(answers: Array<Promise<Outcome<McpServerSummary[]>>>): McpRepository {
  let i = 0
  return {
    list: () => answers[Math.min(i++, answers.length - 1)] as Promise<Outcome<McpServerSummary[]>>,
    write: async () => ok(undefined),
    add: async () => ok({ servers: [] }),
    remove: async () => ok(undefined),
  }
}

describe('D-B-01 load-overview', () => {
  it('T-05 读成功返回清单', async () => {
    const loader = createOverviewLoader({
      repository: repoOf([Promise.resolve(ok(servers(['a'])))]),
    })
    const result = await loader.load('/repo')
    expect(result?.ok).toBe(true)
    expect(result?.value?.map((s) => s.name)).toEqual(['a'])
  })

  it('T-05 读失败返回失败结果，由调用方保留旧快照', async () => {
    const loader = createOverviewLoader({
      repository: repoOf([
        Promise.resolve(fail({ code: 'internal', message: 'boom', timedOut: true })),
      ]),
    })
    const result = await loader.load('/repo')
    expect(result?.ok).toBe(false)
    expect(result?.error?.timedOut).toBe(true)
  })

  it('T-06 后到的旧响应被丢弃（第二次加载已发起）', async () => {
    let releaseFirst: (v: Outcome<McpServerSummary[]>) => void = () => {}
    const first = new Promise<Outcome<McpServerSummary[]>>((resolve) => {
      releaseFirst = resolve
    })
    const repository = repoOf([first, Promise.resolve(ok(servers(['new'])))])
    const loader = createOverviewLoader({ repository })
    const stale = loader.load('/old')
    const fresh = await loader.load('/new')
    releaseFirst(ok(servers(['old'])))
    expect((await stale) === undefined).toBe(true)
    expect(fresh?.value?.map((s) => s.name)).toEqual(['new'])
  })
})
