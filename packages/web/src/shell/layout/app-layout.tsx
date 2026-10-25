'use client'

import { useEffect, useRef } from 'react'
import {
  type PanelImperativeHandle,
  Separator as ResizableHandle,
  Panel as ResizablePanel,
  Group as ResizablePanelGroup,
} from 'react-resizable-panels'
import { useI18n } from '@/shell/frame/i18n-provider'
import type { LayoutProps } from '@/shell/layout/types'
import { useSidebarStore } from '@/shell/orchestration/stores'

/**
 * Layout — 3-zone shell with sidebar/rightPanel show-hide + resize.
 *
 * 设计 (per pi-web AppShell.tsx:2065-2086 + spec §3.1):
 *   ┌─ left (Sidebar + footer) ─┬─ center (top + center) ─┬─ right ─┐
 *
 * Layout 自身不持 business state——sidebarOpen / rightPanelOpen 由
 * useSidebarStore 持有，Layout 仅读取并通过 panelRef.current.{collapse,
 * expand}() 同步到 ResizablePanel（per react-resizable-panels v4 API）。
 *
 * Ruling — react-resizable-panels v4 API renames + percent strings:
 *   v4 renamed PanelGroup -> Group, ResizeHandle -> Separator. Panel
 *   is unchanged. defaultSize / minSize / maxSize accept either a number
 *   (interpreted as PIXELS) or a string with unit ('20%', '300px').
 *   Strings without explicit unit default to '%'; numbers default to 'px'.
 *   We pass strings with '%'. Cost if wrong: trivial switch.
 *
 * Ruling — collapse via panelRef imperative API:
 *   v4 removed `onCollapse` / `onExpand` props from Panel; collapse
 *   behavior is controlled via panelRef.current.collapse()/.expand().
 *   We sync sidebarOpen / rightPanelOpen from store -> ref via useEffect.
 *   Cost if wrong: trivial revert to local state.
 */
export function Layout({
  top,
  center,
  left,
  right,
  onSidebarResize,
}: LayoutProps): React.JSX.Element {
  const { t } = useI18n()
  const sidebarOpen = useSidebarStore((s) => s.sidebarOpen)
  const rightPanelOpen = useSidebarStore((s) => s.rightPanelOpen)
  const rightPanelFull = useSidebarStore((s) => s.rightPanelFull)

  const leftPanelRef = useRef<PanelImperativeHandle>(null)
  const rightPanelRef = useRef<PanelImperativeHandle>(null)

  // Sync sidebarOpen -> left panel
  useEffect(() => {
    if (!leftPanelRef.current) return
    if (sidebarOpen) leftPanelRef.current.expand()
    else leftPanelRef.current.collapse()
  }, [sidebarOpen])

  // 全宽模式：面板本身不会因为 defaultSize 变化而重排，要显式 resize
  useEffect(() => {
    if (!rightPanelRef.current || !rightPanelOpen) return
    rightPanelRef.current.resize(rightPanelFull ? '55%' : '25%')
  }, [rightPanelFull, rightPanelOpen])

  // Sync rightPanelOpen -> right panel
  useEffect(() => {
    if (!rightPanelRef.current) return
    if (rightPanelOpen) rightPanelRef.current.expand()
    else rightPanelRef.current.collapse()
  }, [rightPanelOpen])

  return (
    <ResizablePanelGroup
      orientation="horizontal"
      className="h-screen w-full"
      onLayoutChange={(layout) => {
        if (onSidebarResize && typeof window !== 'undefined' && layout[0]) {
          onSidebarResize(Math.round((layout[0] / 100) * window.innerWidth))
        }
      }}
    >
      {/* Left: sidebar — bg slightly tinted via shadcn --sidebar token;
          border-right gives a visible column edge for cursor targeting. */}
      <ResizablePanel
        panelRef={leftPanelRef}
        collapsible
        collapsedSize="0%"
        minSize="10%"
        maxSize="35%"
        defaultSize="20%"
        id="left"
      >
        <aside
          className="bg-sidebar text-sidebar-foreground flex h-full flex-col border-r border-border"
          data-zone="left"
        >
          {left}
        </aside>
      </ResizablePanel>

      <ResizableHandle className="resize-handle" aria-label={t('layout.resizeSidebar')} />

      {/* Center: chat (always present, fills remaining space) */}
      <ResizablePanel defaultSize="60%" minSize="40%" id="center">
        <main className="flex h-full min-w-0 flex-col" data-zone="center">
          <div data-slot="top">{top}</div>
          <div className="min-h-0 flex-1" data-slot="center">
            {center}
          </div>
        </main>
      </ResizablePanel>

      <ResizableHandle className="resize-handle" aria-label={t('layout.resizeRight')} />

      {/* Right: file viewer / terminal panel */}
      <ResizablePanel
        panelRef={rightPanelRef}
        collapsible
        collapsedSize="0%"
        minSize="20%"
        maxSize={rightPanelFull ? '80%' : '50%'}
        defaultSize={rightPanelFull ? '55%' : '20%'}
        id="right"
      >
        <aside
          className="bg-background flex h-full min-w-0 flex-col border-l border-border"
          data-zone="right"
        >
          {right}
        </aside>
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}
