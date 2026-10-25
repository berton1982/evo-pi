'use client'

import { useState } from 'react'

/**
 * 文件区内部的上下比例（工作区选择器 ↔ 文件树）。
 *
 * 放 hook 不放装配点：`app/*` 只拼 JSX（`check-boundaries` 的 `app:no-logic`
 * 就是抓这个）；这条状态虽然没有副作用，但一旦允许装配点持状态，
 * 下一个"顺手加个 useState"就没人拦得住了。
 */
export function useFilesSplit(initial = 112): {
  workspaceHeight: number
  setWorkspaceHeight: (next: number) => void
} {
  const [workspaceHeight, setWorkspaceHeight] = useState(initial)
  return { workspaceHeight, setWorkspaceHeight }
}
