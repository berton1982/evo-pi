import { describe, expect, it } from 'vitest'
import { sortEntries, type WorkspaceEntry } from '../domain/workspace-entry'
import { createListWorkspace } from './list-workspace'

const repo = (entries: WorkspaceEntry[], error?: { code: string }) => ({
  list: async () => (error ? { entries: [], error } : { entries }),
})

describe('T-41 list-workspace（目录在前 / 失败不抛）', () => {
  it('目录排在文件前，同组按名字', async () => {
    const uc = createListWorkspace({
      repository: repo([
        { name: 'zeta.ts', path: 'zeta.ts', kind: 'file' },
        { name: 'alpha.ts', path: 'alpha.ts', kind: 'file' },
        { name: 'src', path: 'src', kind: 'dir' },
      ]),
    })
    const { entries } = await uc.list({ cwd: '/tmp/x' })
    expect(entries.map((e) => e.name)).toEqual(['src', 'alpha.ts', 'zeta.ts'])
  })

  it('读目录失败返回错误对象而不是抛（整页白屏是更差的默认）', async () => {
    const uc = createListWorkspace({ repository: repo([], { code: 'not-found' }) })
    const res = await uc.list({ cwd: '/nope' })
    expect(res.entries).toEqual([])
    expect(res.error?.code).toBe('not-found')
  })

  it('showIgnored 透传给端口（默认 false）', async () => {
    let seen: boolean | undefined
    const uc = createListWorkspace({
      repository: {
        list: async (_c, _p, opts) => {
          seen = opts?.showIgnored
          return { entries: [] }
        },
      },
    })
    await uc.list({ cwd: '/tmp/x' })
    expect(seen).toBe(false)
    await uc.list({ cwd: '/tmp/x', showIgnored: true })
    expect(seen).toBe(true)
  })

  it('sortEntries 不修改入参', () => {
    const list: WorkspaceEntry[] = [
      { name: 'b', path: 'b', kind: 'file' },
      { name: 'a', path: 'a', kind: 'dir' },
    ]
    sortEntries(list)
    expect(list[0]?.name).toBe('b')
  })
})
