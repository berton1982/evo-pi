'use client'

/**
 * ProjectBox — Phase 0 placeholder (per spec §4.2.5).
 *
 * Phase 5 (worktree) 替换为：
 * - cwd 路径显示
 * - click 打开 DirectoryPicker
 * - 右键打开 worktree 菜单
 */
export function ProjectBox({ cwd }: { cwd?: string }): React.JSX.Element {
  return (
    <div
      className="bg-muted/30 flex items-center gap-2 rounded border px-2 py-1.5 text-xs"
      data-component="project-box-placeholder"
    >
      <div className="bg-muted-foreground/20 size-2 rounded-full" aria-hidden />
      <span className="truncate font-mono" title={cwd ?? 'No project selected'}>
        {cwd ?? 'Select project…'}
      </span>
    </div>
  )
}
