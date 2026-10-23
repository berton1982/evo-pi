import { describe, expect, it } from 'vitest'
import {
  addedNotice,
  applyBatchResults,
  displayPath,
  failureText,
  groupByScope,
  groupStatusText,
  scopeLabel,
  toggleTargets,
} from './mcp-labels'
import type { McpServerSummary } from './mcp-types'

/** 翻译桩：返回 key + 参数，便于断言"用了哪个键"而不是断文案。 */
const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}(${Object.values(params).join(',')})` : key

const server = (name: string, scope: 'user' | 'project', enabled = true): McpServerSummary => ({
  scope,
  name,
  enabled,
  transport: 'stdio',
  sourcePath: `/tmp/${name}`,
})

describe('C-G 域文案与分组', () => {
  it('T-01 作用域文案按 scope 取不同 key', () => {
    expect(scopeLabel('project', t)).toBe('mcp.inProject')
    expect(scopeLabel('user', t)).toBe('mcp.userScope')
  })

  it('T-01 displayPath 优先项目内相对路径，其次家目录缩写', () => {
    expect(displayPath('/repo/.pi/mcp.json', '/home/u', '/repo')).toBe('.pi/mcp.json')
    expect(displayPath('/home/u/.pi/mcp.json', '/home/u', '/repo')).toBe('~/.pi/mcp.json')
    expect(displayPath('/etc/mcp.json', '/home/u', '/repo')).toBe('/etc/mcp.json')
    expect(displayPath('', '/home/u', '/repo')).toBe('')
  })

  it('T-02 失败文案按错误码分类，超时优先于码', () => {
    expect(failureText({ code: 'untrusted' }, t)).toBe('mcp.failure.untrusted')
    expect(failureText({ code: 'nope', timedOut: true }, t)).toBe('mcp.failure.timeout')
    expect(failureText({ code: 'weird', message: 'boom' }, t)).toBe(
      'mcp.failure.genericWithReason(boom)',
    )
    expect(failureText({}, t)).toBe('mcp.failure.generic')
  })

  it('T-03 组头给 enabled/total，添加提示带作用域文案', () => {
    expect(groupStatusText([server('a', 'user'), server('b', 'user', false)], t)).toBe(
      'mcp.groupStatus(1,2)',
    )
    expect(addedNotice(server('x', 'project'), t)).toBe('mcp.addedNotice(x,mcp.inProject)')
  })

  it('T-07 分组顺序固定 user→project，空组不出现', () => {
    const groups = groupByScope([
      server('p1', 'project'),
      server('u1', 'user'),
      server('p2', 'project'),
    ])
    expect(groups.map((g) => g.scope)).toEqual(['user', 'project'])
    expect(groups[1]?.servers.map((s) => s.name)).toEqual(['p1', 'p2'])
    expect(groupByScope([server('u1', 'user')]).map((g) => g.scope)).toEqual(['user'])
  })

  it('T-08 批量目标只含状态需要变的条目', () => {
    const list = [server('on', 'user', true), server('off', 'user', false)]
    expect(toggleTargets(list, true).map((s) => s.name)).toEqual(['off'])
    expect(toggleTargets(list, false).map((s) => s.name)).toEqual(['on'])
  })

  it('T-08 applyBatchResults 只改点名的条目', () => {
    const list = [server('on', 'user', true), server('off', 'user', false)]
    const next = applyBatchResults(list, ['user/off'], true)
    expect(next.map((s) => s.enabled)).toEqual([true, true])
    expect(applyBatchResults(list, ['project/off'], true).map((s) => s.enabled)).toEqual([
      true,
      false,
    ])
  })
})
