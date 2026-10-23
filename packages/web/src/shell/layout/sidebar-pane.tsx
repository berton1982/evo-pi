'use client'

/**
 * Sidebar 壳（只负责标签切换与覆盖层）。
 *
 * 内容由装配点传入：`tabs.sessions` / `tabs.files` 是 ReactNode，
 * 壳不认识任何能力（`shell/**` 不得 import `features/**`，
 * 由 `packages/web/scripts/check-boundaries.mjs` 强制）。
 *
 * 为什么搜索状态要提到装配点：触发搜索的按钮在 SidebarHeader（壳的布局），
 * 而 query 的语义属于会话能力。折中是壳持有 `searchOpen` + `query`，
 * 作为 props 传给能力——壳不解析 query，只透传。
 */

import { useState } from 'react'
import type { SidebarTab } from '@/lib/sidebar-types'
import { useI18n } from '@/shell/frame/i18n-provider'
import { SidebarToast } from '@/shell/orchestration/sidebar-toast'
import { SidebarHeader } from './sidebar-header'
import { SidebarMenu } from './sidebar-menu'

interface SidebarPaneProps {
  tabs: Record<SidebarTab, React.ReactNode>
  /**
   * 搜索开合由装配点的 hook 持有（`useSessionsPage`），壳只转发点击。
   * 壳自己再存一份就会有两个事实源——关掉输入框但过滤态还在，
   * 表现为"会话少了一半"，而代码里看不出谁该负责清空。
   */
  onSearchToggle: () => void
}

export function Sidebar({ tabs, onSearchToggle }: SidebarPaneProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<SidebarTab>('sessions')
  const { t } = useI18n()

  return (
    <div
      className="flex h-full flex-col"
      data-component="sidebar"
      role="region"
      aria-label={t('sidebar.region')}
    >
      <SidebarHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
        // Phase 1（create-session）接新建会话；Phase 0 不假装能建
        onNew={() => {}}
        onSearchToggle={onSearchToggle}
      />
      <div className="min-h-0 flex-1 overflow-hidden" data-component="sidebar-panel">
        {activeTab === 'sessions' ? tabs.sessions : null}
        {activeTab === 'files' ? tabs.files : null}
      </div>
      <SidebarMenu />
      <SidebarToast />
    </div>
  )
}

export type { SidebarTab }
