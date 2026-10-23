'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { useI18n } from '@/shell/frame/i18n-provider'

/**
 * SidebarFooter — AppShell 渲染的 sidebar zone 底部 3 个按钮
 * (per spec §3.3 + §4.2.2: Models / Skills / Settings)。
 *
 * **不**持有业务状态（哪个按钮 active / 当前 section 是哪个）——调用方
 * 决定。我们仅暴露 onSettingsSection callback；按钮可点击，但 Phase 0
 * 只 console.log，不打开 SettingsPanel modal（Task 0.11 接 SettingsPanel）。
 *
 * 重要：sidebar-footer 由 AppShell 直接渲染在 sidebar zone 底部，**不在**
 * SessionSidebar 内部（per spec §4.2.2 "SessionSidebar 不关心 footer"）。
 * 本 Task 0.9 把它当作独立 component 导出；Task 0.10 把 Sidebar 容器组
 * 装好后，Task 0.12 在 app/(sessions)/page.tsx 里把 footer 拼到 left zone。
 */

export type SidebarFooterSection = 'models' | 'skills' | 'settings'

interface SidebarFooterProps {
  onSection: (section: SidebarFooterSection) => void
}

export function SidebarFooter({ onSection }: SidebarFooterProps): React.JSX.Element {
  const { t } = useI18n()
  const [busy, setBusy] = useState<SidebarFooterSection | null>(null)

  function handleClick(section: SidebarFooterSection): void {
    setBusy(section)
    onSection(section)
    // 清 busy 状态让 button 立即可再次点击（modal 开启后会替换 UI）
    queueMicrotask(() => {
      setBusy(null)
    })
  }

  return (
    <div className="flex shrink-0 gap-1 border-t p-2" data-component="sidebar-footer">
      <Button
        variant="ghost"
        size="sm"
        className="flex-1"
        disabled={busy === 'models'}
        onClick={() => {
          handleClick('models')
        }}
        data-section="models"
      >
        {t('settings.models')}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="flex-1"
        disabled={busy === 'skills'}
        onClick={() => {
          handleClick('skills')
        }}
        data-section="skills"
      >
        {t('settings.skills')}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="flex-1"
        disabled={busy === 'settings'}
        onClick={() => {
          handleClick('settings')
        }}
        data-section="settings"
      >
        {t('settings.title')}
      </Button>
    </div>
  )
}
