'use client'

import { FilesPanel } from '@/features/files/files-panel'
import { SessionsTab } from '@/features/sessions/sessions-tab'
import { WorkspacePanel } from '@/features/workspaces/workspace-panel'
import { SidebarFooter } from '@/shell/layout/sidebar-footer'
import { Sidebar } from '@/shell/layout/sidebar-pane'
import type { SessionPage } from '@/shell/orchestration/use-sessions-page'

/** 左栏（页签 + 页脚）：槽位内容由装配点给，壳不 import 能力 */
export function LeftZone({ page }: { page: SessionPage }): React.JSX.Element {
  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1">
        <Sidebar
          onSearchToggle={page.toggleSearch}
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
              <>
                <WorkspacePanel cwd={page.cwd ?? undefined} />
                <FilesPanel />
              </>
            ),
          }}
        />
      </div>
      <SidebarFooter onSection={page.openFromFooter} />
    </div>
  )
}
