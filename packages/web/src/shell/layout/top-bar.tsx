'use client'

import { Maximize2Icon, PanelLeftIcon, PanelRightIcon } from 'lucide-react'

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
  /** 顶栏的"新建"是 pi-web 的位置；侧栏的 + 仍在，两个入口同一个动作 */
  onNewSession?: () => void
}

export function TopBar({
  onSettingsSection: _onSettingsSection,
  onNewSession,
}: TopBarProps): React.JSX.Element {
  const { t } = useI18n()
  const toggleSidebar = useSidebarStore((s) => s.toggleSidebar)
  const sidebarOpen = useSidebarStore((s) => s.sidebarOpen)
  const rightPanelOpen = useSidebarStore((s) => s.rightPanelOpen)
  const rightPanelFull = useSidebarStore((s) => s.rightPanelFull)
  const toggleRightPanelFull = useSidebarStore((s) => s.toggleRightPanelFull)
  // 右侧面板的唯一开关就是这个（别再往旁边加同名按钮）
  const toggleRightPanel = useSidebarStore((s) => s.toggleRightPanel)

  return (
    <div
      // 顶栏是全局唯一的 banner 地标。<div role="banner"> 是 ARIA 的标准写法；
      // 用 <header role="banner"> 会被 biome 判"给交互元素套非交互角色"（它把 header 当 landmark）
      role="banner"
      aria-label={t('topbar.region')}
      data-component="top-bar"
      className="flex h-9 shrink-0 items-center gap-2 border-b px-3"
    >
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        onClick={toggleSidebar}
        aria-label={sidebarOpen ? t('topbar.hideSidebar') : t('topbar.showSidebar')}
        data-action="sidebar-toggle"
      >
        <PanelLeftIcon className="size-4" />
      </Button>

      <Separator orientation="vertical" className="mx-1 h-4" />

      {onNewSession ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onNewSession}
          aria-label={t('topbar.new')}
          data-action="new-session"
        >
          {t('topbar.new')}
        </Button>
      ) : null}

      <span className="text-muted-foreground text-xs" data-slot="chat-toolbar-placeholder">
        {t('topbar.placeholder')}
      </span>

      {/* spacer pushes right-zone toggle to the right edge */}
      <div className="flex-1" />

      {/* 「全宽」常驻：pi-web 顶栏一直显示它（面板关着也显示）。
          早先按 rightPanelOpen 条件渲染，保真对比里永远采不到这个名字。 */}
      <div className="flex items-center gap-1">
        {/* 全宽：把右侧面板撑到一半以上。pi-web 顶栏同一位置有这个名字，保真对比要能对上 */}
        <Button
          type="button"
          size="icon-sm"
          variant={rightPanelFull ? 'secondary' : 'ghost'}
          onClick={toggleRightPanelFull}
          aria-pressed={rightPanelFull}
          aria-label={t('files.fullWidth')}
          data-action="files-full-width"
        >
          <Maximize2Icon className="size-4" />
        </Button>
        {/* 这里不再自己加一个"隐藏文件面板"：顶栏右侧已有 right-panel-toggle
            （同样的动作、同样的名字），两个按钮做同一件事会让 e2e 的
            getByRole 命中 3 个元素——重复入口本身就是缺陷，不是选择器问题。 */}
      </div>

      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        onClick={toggleRightPanel}
        aria-label={rightPanelOpen ? t('topbar.hideFiles') : t('topbar.showFiles')}
        data-action="right-panel-toggle"
      >
        <PanelRightIcon className="size-4" />
      </Button>
    </div>
  )
}
