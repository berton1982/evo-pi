'use client'

import type { WorkspaceEntry } from '@evo-pi/core/files'
import { ChevronRightIcon, FileIcon, FolderIcon } from 'lucide-react'
import type { WorkspaceFilesState } from './use-workspace-files'

/**
 * 文件树（一层一层展开）。
 *
 * 结构对齐 pi-web：`role=tree` + 每个条目 `role=treeitem` + `aria-expanded`（目录），
 * 这样键盘与读屏能走树，保真快照也能按角色比对，而不是只比"有没有 div"。
 */
export function FileExplorer({
  cwd,
  state,
  filter = '',
  // 打开文件要 C-C 的查看器，本能力只负责树；参数保留在类型里以便 C-F 接上时不改调用方
  onOpenFile,
}: {
  cwd: string | null
  state: WorkspaceFilesState
  /** 名字过滤（工具栏的搜索框）：只在当前层生效，不改变展开状态 */
  filter?: string
  onOpenFile?: (entry: WorkspaceEntry) => void
}): React.JSX.Element {
  if (!cwd) {
    return (
      <div className="text-muted-foreground p-3 text-xs" data-component="file-explorer">
        还没有选择工作区
      </div>
    )
  }
  if (state.error) {
    return (
      <div className="p-3 text-xs text-destructive" data-component="file-explorer">
        读不了这个目录：{state.error.message ?? state.error.code}
      </div>
    )
  }
  const rows: React.JSX.Element[] = []
  // 搜索是"当前层过滤"，不是再请求一次后端：`filter` 之前只传不落——
  // 工具栏的搜索框看着能用、实际什么都没发生（biome 的 noUnusedFunctionParameters 抓出来的）
  const needle = filter.trim().toLowerCase()
  const walk = (list: readonly WorkspaceEntry[], depth: number) => {
    for (const e of list) {
      if (needle && !e.name.toLowerCase().includes(needle)) continue
      const open = state.expanded.has(e.path)
      const isDir = e.kind === 'dir'
      rows.push(
        <div
          key={e.path}
          role="treeitem"
          aria-expanded={isDir ? open : undefined}
          aria-level={depth + 1}
          className="hover:bg-accent/50 flex cursor-pointer items-center gap-1 rounded px-1 py-0.5 text-xs"
          style={{ paddingLeft: `${depth * 12 + 4}px` }}
          onClick={() => (isDir ? state.toggle(e.path) : onOpenFile?.(e))}
          onKeyDown={(event) => {
            // treeitem 必须可键盘操作：Enter/Space 等于点一下（a11y 门要求可聚焦且可操作）
            if (event.key !== 'Enter' && event.key !== ' ') return
            event.preventDefault()
            if (isDir) state.toggle(e.path)
            else onOpenFile?.(e)
          }}
          tabIndex={0}
          data-path={e.path}
        >
          {isDir ? (
            <ChevronRightIcon className={`size-3 ${open ? 'rotate-90' : ''}`} aria-hidden />
          ) : (
            <span className="size-3" aria-hidden />
          )}
          {isDir ? (
            <FolderIcon className="size-3" aria-hidden />
          ) : (
            <FileIcon className="size-3" aria-hidden />
          )}
          <span className="truncate">{e.name}</span>
        </div>,
      )
      if (isDir && open) walk(state.childrenOf[e.path] ?? [], depth + 1)
    }
  }
  walk(state.entries, 0)

  return (
    <div
      className="min-h-0 flex-1 overflow-y-auto p-1"
      role="tree"
      aria-label={cwd}
      aria-busy={state.loading}
      data-component="file-explorer"
    >
      {rows.length ? rows : <div className="text-muted-foreground p-2 text-xs">这个目录是空的</div>}
    </div>
  )
}
