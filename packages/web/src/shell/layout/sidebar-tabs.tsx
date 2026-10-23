'use client'

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { SidebarTab } from '@/lib/sidebar-types'
import { useI18n } from '@/shell/frame/i18n-provider'

/**
 * Sidebar tabs (Sessions / Files).
 *
 * Phase 0 仅渲染两个 tab，可点击切换；具体面板内容由 Sidebar container
 * 根据 selected tab 渲染。
 */
interface SidebarTabsProps {
  value: SidebarTab
  onChange: (next: SidebarTab) => void
}

export function SidebarTabs({ value, onChange }: SidebarTabsProps): React.JSX.Element {
  const { t } = useI18n()
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as SidebarTab)}>
      <TabsList className="grid w-full grid-cols-2" data-component="sidebar-tabs">
        <TabsTrigger value="sessions" data-tab="sessions">
          {t('sidebar.tab.sessions')}
        </TabsTrigger>
        <TabsTrigger value="files" data-tab="files">
          {t('sidebar.tab.files')}
        </TabsTrigger>
      </TabsList>
    </Tabs>
  )
}
