'use client'

import { useI18n } from '@/shell/frame/i18n-provider'

/**
 * RightZone — Phase 0 placeholder (per plan §0.11).
 *
 * Per spec §3.3, RightZone hosts:
 * - TabBar (placeholder)
 * - FileViewer / TerminalPanel (placeholder)
 *
 * Phase 0 renders one big "Right zone (placeholder)" message.
 */
interface RightZoneProps {
  activeTabId?: string
  tabs: readonly { id: string; label: string }[]
}

export function RightZone({ activeTabId: _activeTabId, tabs }: RightZoneProps): React.JSX.Element {
  const { t } = useI18n()
  return (
    <aside className="flex h-full flex-col" data-component="right-zone">
      <div className="flex h-9 items-center border-b px-3">
        <div className="flex gap-1 text-xs">
          {tabs.map((tab) => (
            <div key={tab.id} className="bg-muted/30 rounded px-2 py-1 text-xs" data-tab={tab.id}>
              {tab.label}
            </div>
          ))}
        </div>
      </div>
      <div className="text-muted-foreground flex flex-1 items-center justify-center p-6 text-sm">
        {t('rightzone.placeholder')}
      </div>
    </aside>
  )
}
