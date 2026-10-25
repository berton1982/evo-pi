import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createFsSubagentProfiles, formatProfile, parseProfile } from './subagent-profiles'

const dirs: string[] = []
afterEach(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true })
  dirs.length = 0
})

/** T-06 */
describe('子代理档案（T-06 落盘格式）', () => {
  it('解析 frontmatter 并保留正文', () => {
    const p = parseProfile(
      '---\nname: reviewer\ndescription: 只读审查\nmodel: claude\n---\n正文第一行\n第二行\n',
    )
    expect(p).toEqual({
      name: 'reviewer',
      description: '只读审查',
      model: 'claude',
      body: '正文第一行\n第二行\n',
    })
  })

  it('缺 frontmatter 抛带文件名的错（不静默返回空档案）', () => {
    expect(() => parseProfile('正文', 'x.md')).toThrow(/x\.md: 缺 frontmatter/)
  })

  it('保存后能读回，删除生效且不可重复删', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'subagent-'))
    dirs.push(dir)
    const store = createFsSubagentProfiles(() => dir)
    await store.save({ name: 'a', description: 'd', body: 'hello' })
    const list = await store.list()
    expect(list.map((x) => x.name)).toEqual(['a'])
    expect(await store.remove('a')).toBe(true)
    expect(await store.remove('a')).toBe(false)
  })

  it('目录不存在时 list 返回空数组而不是抛错', async () => {
    const dir = join(tmpdir(), 'not-exist-subagent-profile')
    const store = createFsSubagentProfiles(() => dir)
    expect(await store.list()).toEqual([])
  })

  it('format 与 parse 互逆', () => {
    const text = formatProfile({ name: 'b', model: 'm', body: 'body' })
    expect(parseProfile(text).name).toBe('b')
  })
})
