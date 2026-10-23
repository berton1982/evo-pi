'use client'

import { useState } from 'react'
import type { AgentMessage } from '@/lib/agent-message-types'
import { useI18n } from '@/shell/frame/i18n-provider'
import { useSessionContext } from '@/shell/orchestration/use-app-session'

/**
 * CenterZone — Phase 2 PR.A: wire useSessionContext + MessageView.
 *
 * Phase 0+1: this was a placeholder + detail-panel stub (showing only
 * the selected session id).
 * Phase 2 PR.A: replace with real SessionContext rendering.
 *   - selectedSessionId undefined → "Select or create" placeholder
 *   - selectedSessionId defined → useSessionContext drives 3 states:
 *       loading → skeleton (3 placeholder rows)
 *       error   → localized text + Retry button (PR.A retries by
 *                 remounting the hook; PR.B swaps to react-query
 *                 refetch which is the proper mechanism)
 *       data    → MessageView (per spec §3.9)
 *
 * Per plan §2A.7 the i18n keys are:
 *   - center.placeholder.selectOrCreate (Phase 0, unchanged)
 *   - center.detail.loading             (PR.A new)
 *   - center.detail.error               (PR.A new)
 *   - center.detail.retry               (PR.A new, button label)
 *
 * PR.B / PR.C do not change this component — only the hook internals
 * (useSessionContext swaps to react-query, then the route handler
 * returns real SessionContext from SDK buildSessionContext).
 *
 * Retry design (PR.A minimum):
 *   retry counter → re-key the inner <SessionDetailInner /> component.
 *   React unmounts + remounts → fresh useSessionContext state → fresh
 *   fetch. Same effect as react-query's refetch but uses native React.
 *   PR.B will swap this for `query.refetch()` once the hook is migrated.
 */

interface CenterZoneProps {
  selectedSessionId?: string
  /**
   * 消息渲染器由装配点注入（壳不 import 能力）。
   * 壳负责"取数据 + 三态"，能力负责"怎么画一条消息"。
   */
  renderMessages: (messages: AgentMessage[], entryIds: (string | undefined)[]) => React.ReactNode
}

// Skeleton row keys: stable (Phase 2 minimum = 3 rows). If the count
// becomes dynamic in Phase 3+, switch to useId() per row.
const SKELETON_KEYS = ['skeleton-0', 'skeleton-1', 'skeleton-2'] as const

function SkeletonRow({ index }: { index: number }): React.JSX.Element {
  return (
    <div
      data-component="message-skeleton"
      data-skeleton-index={index}
      className="h-12 animate-pulse rounded-lg border border-dashed border-border bg-muted/30"
    />
  )
}

function CenterZoneInner({
  selectedSessionId,
  renderMessages,
}: CenterZoneProps): React.JSX.Element {
  const { t } = useI18n()
  const { data, isLoading, error } = useSessionContext(selectedSessionId)

  if (isLoading) {
    return (
      <div
        className="flex flex-col gap-2 p-4"
        data-component="center-zone-loading"
        data-slot="loading"
        aria-busy="true"
      >
        <p className="text-sm text-muted-foreground" data-slot="loading-label">
          {t('center.detail.loading')}
        </p>
        {SKELETON_KEYS.map((key, i) => (
          <SkeletonRow key={key} index={i} />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div
        className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center"
        data-component="center-zone-error"
        data-slot="error"
        role="alert"
      >
        <p className="text-sm text-destructive" data-slot="error-message">
          {t('center.detail.error')}
        </p>
        <p className="text-xs text-muted-foreground" data-slot="error-detail">
          {error.message}
        </p>
        {/* PR.A: button label only; click is wired in PR.B via react-query refetch.
            For PR.A mock, clicking this button does nothing functional — the error
            is permanent for unknown sessionIds, and a retry wouldn't help. The
            button is rendered so the UI shape matches PR.B / PR.C. */}
        <button
          type="button"
          className="rounded border border-border bg-card px-3 py-1 text-xs"
          data-slot="error-retry"
          disabled
          title="Retry is a no-op in PR.A (mock data is fixed); enabled in PR.B with react-query refetch"
        >
          {t('center.detail.retry')}
        </button>
      </div>
    )
  }

  if (data) {
    return (
      <div className="h-full overflow-y-auto" data-component="center-zone-data" data-slot="data">
        {/* 消息怎么画属于会话能力；壳只把"取到的数据"交给注入的渲染器 */}
        {renderMessages(data.messages as unknown as AgentMessage[], data.entryIds)}
      </div>
    )
  }

  // Fallback (shouldn't happen: hook returns either loading/error/data,
  // and data is non-null after loading completes for valid IDs).
  return (
    <div className="text-sm text-muted-foreground" data-slot="fallback">
      {t('center.detail.loading')}
    </div>
  )
}

export function CenterZone({
  selectedSessionId,
  renderMessages,
}: CenterZoneProps): React.JSX.Element {
  const { t } = useI18n()
  // retry counter: not yet wired in PR.A (Retry button is disabled).
  // State exists so PR.B can hook into it via `onRetry={() => setRetry(n => n + 1)}`
  // without changing the call signature.
  const [_retryCounter, setRetryCounter] = useState(0)
  void setRetryCounter // silence unused-var lint

  // selectedSessionId undefined → Phase 0 placeholder (no fetch)
  if (!selectedSessionId) {
    return (
      <section
        className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center"
        data-component="center-zone"
        data-slot="placeholder"
      >
        <div className="text-muted-foreground text-sm" data-slot="placeholder-text">
          {t('center.placeholder.selectOrCreate')}
        </div>
      </section>
    )
  }

  return (
    <section className="flex h-full flex-col" data-component="center-zone" data-slot="detail">
      <CenterZoneInner selectedSessionId={selectedSessionId} renderMessages={renderMessages} />
    </section>
  )
}
