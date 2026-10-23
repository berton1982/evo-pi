'use client'

/**
 * WorktreeBox — Phase 0 placeholder (per spec §4.2.5).
 *
 * Phase 5 (worktree) 替换为：
 * - git branch 显示
 * - click 打开 worktree 列表
 * - disabled 当 cwd 是 non-git 目录
 */
export function WorktreeBox({ branch }: { branch?: string }): React.JSX.Element {
  return (
    <div
      className="bg-muted/30 flex items-center gap-2 rounded border px-2 py-1.5 text-xs"
      data-component="worktree-box-placeholder"
    >
      <div className="bg-muted-foreground/20 size-2 rounded-full" aria-hidden />
      <span className="truncate font-mono" title={branch ?? 'No worktree'}>
        {branch ?? '—'}
      </span>
    </div>
  )
}
