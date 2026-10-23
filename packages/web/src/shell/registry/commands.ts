'use client'

/**
 * 壳的命令契约（键盘与菜单共用同一个来源）。
 *
 * 为什么要有注册表而不是在组件里各写 `onKeyDown`：pi-web 的快捷键散落在
 * `hooks/useKeyboardShortcuts.ts` 与若干组件的 `onKeyDown` 里，迁移时最容易漏掉
 * "同一个键在不同面板里行为不同"这类问题。集中登记后，冲突（同键同作用域两条命令）
 * 可以在测试里直接判红。
 *
 * 规矩：
 * - 命令只描述"做什么"，不持有状态；执行时由装配点注入的回调完成副作用。
 * - `scope` 表达"什么时候生效"：`global` 全局；`not-input` 输入框聚焦时不触发（默认）。
 * - 与 `registry/panels.ts` 同向：feature 可以 import 本文件类型，shell 不 import feature。
 */

export type CommandScope = 'global' | 'not-input'

export interface CommandSpec {
  id: string
  /** 显示名（i18n key 或字面量） */
  label: string
  /** 组合键，如 `mod+alt+n` / `escape`；`mod` 在 mac 是 ⌘、其它平台是 Ctrl */
  keys?: string[]
  scope?: CommandScope
  run: () => void
}

/** 恒等函数：只为拿到类型检查与 grep 落点 */
export const defineCommand = (spec: CommandSpec): CommandSpec => spec

const MOD = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform) ? 'meta' : 'ctrl'

/** 把 KeyboardEvent 归一成 `mod+alt+n` 这种可比较的字符串（不含 Shift 的键位差异） */
export function comboOf(e: {
  key: string
  ctrlKey: boolean
  metaKey: boolean
  altKey: boolean
  shiftKey: boolean
}): string {
  const parts: string[] = []
  // `mod` 是平台无关的修饰键：注册表里只写 mod，不写 meta/ctrl
  if (e.ctrlKey || e.metaKey) parts.push('mod')
  if (e.altKey) parts.push('alt')
  if (e.shiftKey) parts.push('shift')
  parts.push(e.key.toLowerCase())
  return parts.join('+')
}

/** 输入类元素聚焦时不触发 not-input 作用域的命令（否则 Ctrl+A 全选会话会被抢走） */
export function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el || typeof el.tagName !== 'string') return false
  const tag = el.tagName.toLowerCase()
  return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable === true
}

export interface CommandRegistry {
  list: () => CommandSpec[]
  /** 找出与本次按键匹配的命令（同键多条即冲突，由 `findConflicts` 在测试里拦） */
  match: (e: KeyboardEvent) => CommandSpec | null
}

export function createCommandRegistry(specs: readonly CommandSpec[]): CommandRegistry {
  const list = [...specs]
  return {
    list: () => list,
    match(e) {
      const combo = comboOf(e)
      const typing = isTypingTarget(e.target)
      return (
        list.find(
          (c) =>
            (c.keys ?? []).some((k) => normalizeCombo(k) === combo) &&
            !(typing && (c.scope ?? 'not-input') === 'not-input'),
        ) ?? null
      )
    },
  }
}

/** `Ctrl+Alt+N` / `mod+alt+n` 都归一成 `mod+alt+n` */
export function normalizeCombo(k: string): string {
  return k
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/\bcontrol\b|\bmeta\b|\bcmd\b|\b⌘\b/g, 'mod')
    .split('+')
    .map((p) => (p === 'mod' ? MOD : p))
    .join('+')
}

/** 同一组合键 + 同一作用域出现两条命令 → 返回冲突描述（测试用；运行期不静默去重） */
export function findConflicts(specs: readonly CommandSpec[]): string[] {
  const seen = new Map<string, string>()
  const out: string[] = []
  for (const c of specs) {
    for (const k of c.keys ?? []) {
      const key = `${normalizeCombo(k)}|${c.scope ?? 'not-input'}`
      const prev = seen.get(key)
      if (prev) out.push(`${k} 同时绑定到 ${prev} 与 ${c.id}`)
      else seen.set(key, c.id)
    }
  }
  return out
}
