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
  /** 当前项目根（null = 还没选项目）：项目选择器显示它 */
  cwd: string | null
  /** 换项目交给装配点的 hook（URL 是唯一事实源，壳只转发） */
  onPickProject: (next: string) => void
  /** 新建会话（POST /api/sessions 只发号，落盘在第一条消息时） */
  onNew: () => void
}

export function Sidebar({
  tabs,
  onSearchToggle,
  cwd,
  onPickProject,
  onNew,
}: SidebarPaneProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<SidebarTab>('sessions')
  const { t } = useI18n()

  return (
    <section
      className="flex h-full flex-col"
      data-component="sidebar"
      aria-label={t('sidebar.region')}
    >
      <SidebarHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onNew={onNew}
        onSearchToggle={onSearchToggle}
        cwd={cwd}
        onPickProject={onPickProject}
      />
      <div className="min-h-0 flex-1 overflow-hidden" data-component="sidebar-panel">
        {activeTab === 'sessions' ? tabs.sessions : null}
        {activeTab === 'files' ? tabs.files : null}
      </div>
      <SidebarMenu />
      <SidebarToast />
    </section>
  )
}

export type { SidebarTab }
