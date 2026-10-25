'use client'

import { FilesPanel } from '@/features/files/files-panel'
import { SessionsTab } from '@/features/sessions/sessions-tab'
import { WorkspacePanel } from '@/features/workspaces/workspace-panel'
import { ResizeHandle } from '@/shell/layout/resize-handle'
import { SidebarFooter } from '@/shell/layout/sidebar-footer'
import { Sidebar } from '@/shell/layout/sidebar-pane'
import { useFilesSplit } from '@/shell/orchestration/use-files-split'
import type { SessionPage } from '@/shell/orchestration/use-sessions-page'

/** 左栏（页签 + 页脚）：槽位内容由装配点给，壳不 import 能力 */
export function LeftZone({ page }: { page: SessionPage }): React.JSX.Element {
  // 文件区里"工作区选择器 / 文件树"的上下比例：pi-web 用可拖分隔条（separator），
  // 我们照做——文件多的时候把树拉高，是高频道操作而不是配置项
  const { workspaceHeight, setWorkspaceHeight } = useFilesSplit()

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1">
        <Sidebar
          onSearchToggle={page.toggleSearch}
          cwd={page.cwd}
          onPickProject={page.selectProject}
          onNew={() => void page.createSession()}
          tabs={{
            sessions: (
              <SessionsTab
                searchOpen={page.searchOpen}
                query={page.searchQuery}
                onQueryChange={page.setSearchQuery}
                selectedSessionId={page.selectedSessionId}
                onSelectSession={page.selectSession}
              />
            ),
            files: (
              <div className="flex h-full flex-col">
                <div style={{ height: workspaceHeight }} className="shrink-0 overflow-hidden">
                  <WorkspacePanel cwd={page.cwd ?? undefined} />
                </div>
                <ResizeHandle
                  label="调整文件浏览器高度"
                  orientation="horizontal"
                  value={workspaceHeight}
                  min={56}
                  max={280}
                  onChange={setWorkspaceHeight}
                />
                <div className="min-h-0 flex-1">
                  <FilesPanel cwd={page.cwd ?? null} />
                </div>
              </div>
            ),
          }}
        />
      </div>
      <SidebarFooter onSection={page.openFromFooter} />
    </div>
  )
}
