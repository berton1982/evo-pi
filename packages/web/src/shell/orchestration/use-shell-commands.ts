'use client'

import { useEffect, useRef } from 'react'
import { type CommandSpec, createCommandRegistry } from '@/shell/registry/commands'

/**
 * 把壳级命令挂到 window（一次），并保证"只有一个分发器"。
 *
 * 为什么不用每个组件各自 `onKeyDown`：pi-web 的快捷键散在 `useKeyboardShortcuts` 与
 * 若干组件里，同一个键在不同面板行为不同，迁移时最容易漏。集中到一处后，
 * 冲突可以在单测里判红（`findConflicts`），作用域（输入框里不抢键）也只有一个实现。
 *
 * 依赖用 ref 保存：命令是每次渲染新建的数组，直接进 deps 会导致反复解绑/绑定。
 */
export function useShellCommands(commands: readonly CommandSpec[]): void {
  const ref = useRef(commands)
  ref.current = commands

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const registry = createCommandRegistry(ref.current)
      const hit = registry.match(e)
      if (!hit) return
      // 命中了就交给我，别让浏览器再处理（比如 Ctrl+Alt+N 的新建窗口）
      e.preventDefault()
      hit.run()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
