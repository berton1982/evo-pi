'use client'

import { ProjectBox } from '@/features/workspaces/project-box'
import { WorktreeBox } from '@/features/workspaces/worktree-box'

/**
 * WorkspacePanel — stacked Project + Worktree boxes (per spec §4.2.1).
 *
 * Phase 0 placeholder: 两个 box 都显示骨架态。
 * Phase 5 (worktree) 替换为真实 picker，订阅 useCurrentProject() hook。
 */
interface WorkspacePanelProps {
  cwd?: string
  branch?: string
}

export function WorkspacePanel({ cwd, branch }: WorkspacePanelProps): React.JSX.Element {
  return (
    <div className="flex flex-col gap-1 p-2" data-component="project-worktree-picker-placeholder">
      <ProjectBox cwd={cwd} />
      <WorktreeBox branch={branch} />
    </div>
  )
}
