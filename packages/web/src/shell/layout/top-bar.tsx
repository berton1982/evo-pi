'use client'

import { PanelLeftIcon, PanelRightIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

import { useI18n } from '@/shell/frame/i18n-provider'
import { useSidebarStore } from '@/shell/orchestration/stores'

/**
 * TopBar — sidebar toggle (left), chat toolbar placeholder (middle),
 * right zone toggle (right) (per spec §3.1 + plan §0.11).
 *
 * Toggle buttons drive useSidebarStore; the Layout component listens and
 * collapses/expands the corresponding ResizablePanel via imperative ref.
 *
 * The full chat toolbar (model / thinking / session stats) lives in
 * agent capability (Phase 1+) — Phase 0 renders only placeholders.
 */
interface TopBarProps {
  onSettingsSection: (section: 'general' | 'models' | 'skills' | 'mcp') => void
}

export function TopBar({ onSettingsSection: _onSettingsSection }: TopBarProps): React.JSX.Element {
  const { t } = useI18n()
  const toggleSidebar = useSidebarStore((s) => s.toggleSidebar)
  const toggleRightPanel = useSidebarStore((s) => s.toggleRightPanel)

  return (
    <header data-component="top-bar" className="flex h-9 shrink-0 items-center gap-2 border-b px-3">
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        onClick={toggleSidebar}
        aria-label={t('topbar.toggleSidebar')}
        data-action="sidebar-toggle"
      >
        <PanelLeftIcon className="size-4" />
      </Button>

      <Separator orientation="vertical" className="mx-1 h-4" />

      <span className="text-muted-foreground text-xs" data-slot="chat-toolbar-placeholder">
        {t('topbar.placeholder')}
      </span>

      {/* spacer pushes right-zone toggle to the right edge */}
      <div className="flex-1" />

      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        onClick={toggleRightPanel}
        aria-label={t('topbar.toggleRightPanel')}
        data-action="right-panel-toggle"
      >
        <PanelRightIcon className="size-4" />
      </Button>
    </header>
  )
}
