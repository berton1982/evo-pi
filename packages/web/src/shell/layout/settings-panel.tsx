'use client'

/**
 * SettingsPanel — 设置弹窗的**宿主**（只负责壳：标题、分区列表、关闭）。
 *
 * 与 pi-web 对齐：设置是 AppShell 内的**弹窗**，不是独立路由
 * （`ref_projects/pi-web/components/AppShell.tsx` 的设置走 modal；
 * 迁到 evo-pi 后如果改成 `/settings` 路由，用户反馈"进设置的方式不对"）。
 *
 * 分区内容不在这里：壳只渲染 `panels` 里给出的 spec。
 * 这样加一个能力（比如 models）只改装配点 `app/sessions/page.tsx`，
 * 不动这个文件——这也是"shell 不 import features"能成立的唯一做法。
 */

import { XIcon } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useI18n } from '@/shell/frame/i18n-provider'
import { type SettingsPanelSpec, type SettingsSection, sortPanels } from '@/shell/registry/panels'

export type { SettingsPanelSpec, SettingsSection }

interface SettingsPanelProps {
  cwd: string | null
  sessionId: string | null
  initialSection: SettingsSection | null
  onClose: () => void
  /** 由装配点注入；缺省时只剩占位分区（说明"还没接"而不是假装有） */
  panels: readonly SettingsPanelSpec[]
}

export function SettingsPanel({
  cwd,
  sessionId,
  initialSection,
  onClose,
  panels,
}: SettingsPanelProps): React.JSX.Element {
  const { t } = useI18n()
  const sections = sortPanels(panels)
  const [section, setSection] = useState<SettingsSection>(initialSection ?? 'general')
  const active = sections.find((s) => s.id === section)

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        data-section="settings-dialog"
        className="max-w-[calc(100%-2rem)] sm:max-w-5xl"
      >
        <DialogHeader className="flex flex-row items-center justify-between gap-2">
          <DialogTitle>{t('settings.title')}</DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label={t('settings.closeButton')}
            data-component="settings-close"
          >
            <XIcon className="size-4" />
          </Button>
        </DialogHeader>

        <div className="flex gap-3" data-component="settings-body">
          <nav
            className="flex w-40 shrink-0 flex-col gap-1"
            aria-label={t('settings.title')}
            data-component="settings-nav"
          >
            {sections.map((item) => (
              <Button
                key={item.id}
                variant={section === item.id ? 'secondary' : 'ghost'}
                className="justify-start"
                onClick={() => {
                  setSection(item.id)
                }}
                data-section={item.id}
                aria-pressed={section === item.id}
              >
                {/* label 既可能是 i18n key，也可能是字面量（如 "MCP"） */}
                {item.label.startsWith('settings.') ? t(item.label) : item.label}
              </Button>
            ))}
          </nav>

          <div className="min-h-[320px] flex-1 px-1 pb-1" data-component="settings-section-body">
            {active?.Component ? (
              <active.Component cwd={cwd} sessionId={sessionId} />
            ) : (
              <p className="text-muted-foreground text-sm">
                {t('settings.placeholder')} · {section}
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
