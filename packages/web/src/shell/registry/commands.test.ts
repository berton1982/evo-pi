import { describe, expect, it } from 'vitest'
import {
  type CommandSpec,
  comboOf,
  createCommandRegistry,
  findConflicts,
  isTypingTarget,
  normalizeCombo,
} from './commands'

const cmd = (
  id: string,
  keys: string[],
  scope: CommandSpec['scope'] = 'not-input',
): CommandSpec => ({
  id,
  label: id,
  keys,
  scope,
  run: () => {},
})

const key = (k: string, mods: Partial<KeyboardEvent> = {}, target: EventTarget | null = null) =>
  ({
    key: k,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    shiftKey: false,
    target,
    ...mods,
  }) as KeyboardEvent

describe('T-38 命令注册表（键位归一 / 作用域 / 冲突）', () => {
  it('把 ctrl/⌘ 归一到 mod，大小写与空格无关', () => {
    expect(normalizeCombo('Ctrl+Alt+N')).toBe(normalizeCombo('mod+alt+n'))
    expect(normalizeCombo(' Escape ')).toBe('escape')
  })

  it('comboOf 从事件还原可比较的键位（mod 随平台）', () => {
    expect(comboOf(key('n', { ctrlKey: true, altKey: true }))).toMatch(
      /^(mod\+alt\+n)$|^(ctrl\+alt\+n)$/,
    )
    expect(comboOf(key('Escape'))).toBe('escape')
  })

  it('输入框聚焦时 not-input 作用域不触发，全局命令仍然触发', () => {
    const input = { tagName: 'INPUT', isContentEditable: false } as unknown as EventTarget
    expect(isTypingTarget(input)).toBe(true)
    const reg = createCommandRegistry([
      cmd('escape', ['escape']),
      cmd('global-esc', ['escape'], 'global'),
    ])
    expect(reg.match(key('Escape', {}, input))?.id).toBe('global-esc')
    expect(reg.match(key('Escape'))?.id).toBe('escape')
  })

  it('同键同作用域两条命令判为冲突（不许静默去重）', () => {
    expect(findConflicts([cmd('a', ['mod+alt+n']), cmd('b', ['ctrl+alt+n'])])).toHaveLength(1)
    expect(
      findConflicts([cmd('a', ['mod+alt+n']), cmd('b', ['mod+alt+n'], 'global')]),
    ).toHaveLength(0)
  })
})
