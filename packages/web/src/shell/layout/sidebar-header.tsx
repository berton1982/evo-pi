'use client'

import { PlusIcon, SearchIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { SidebarTab } from '@/lib/sidebar-types'
import { useI18n } from '@/shell/frame/i18n-provider'
import { SidebarTabs } from '@/shell/layout/sidebar-tabs'

/**
 * SidebarHeader — header row: tabs + [+ new] + [🔍 search toggle]
 *
 * Phase 0 按钮可点击但只 console.log——具体行为由后续 capability 填充
 * (sessions: create-session, files: no-op when no cwd)。
 */
interface SidebarHeaderProps {
  activeTab: SidebarTab
  onTabChange: (tab: SidebarTab) => void
  onNew: () => void
  onSearchToggle: () => void
}

export function SidebarHeader({
  activeTab,
  onTabChange,
  onNew,
  onSearchToggle,
}: SidebarHeaderProps): React.JSX.Element {
  const { t } = useI18n()
  return (
    <header
      className="flex h-9 shrink-0 items-center gap-2 border-b px-2"
      data-component="sidebar-header"
    >
      <div className="min-w-0 flex-1">
        <SidebarTabs value={activeTab} onChange={onTabChange} />
      </div>
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        onClick={onNew}
        aria-label={t('sidebar.new')}
        data-action="new"
      >
        <PlusIcon className="size-4" />
      </Button>
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        onClick={onSearchToggle}
        aria-label={t('sidebar.search')}
        data-action="search-toggle"
      >
        <SearchIcon className="size-4" />
      </Button>
    </header>
  )
}
