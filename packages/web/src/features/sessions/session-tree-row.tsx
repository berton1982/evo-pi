'use client'

import type { SessionInfo } from '@earendil-works/pi-coding-agent'

/**
 * SessionTreeRow — Phase 1 PR.A 真实 row 组件。
 *
 * 渲染字段（per plan §1A.5）：
 * - title: name ?? firstMessage 截断 50 字符 + ellipsis ?? id 截断 12 字符
 * - meta: messageCount（locale 暂时不做 i18n；Phase 2+ 加 useI18n）
 * - 视觉：54px 固定高（per study #1 §4.1）
 *
 * PR.A scope：单方法 wrapper，不实现拖拽 / 重命名 / archive / 子 agent 行 /
 * context menu（这些是后续 phase）。
 *
 * 行为：
 * - onClick 调用 onSelect(session.id)
 * - selected=true → aria-current="true"，用于高亮当前 active session
 */

export const SESSION_TREE_ROW_HEIGHT_PX = 54
const TITLE_MAX_CHARS = 50

/**
 * Session row display title — 与 pi-web sessionRowTitle 同源：
 * name > firstMessage（截断 50）> id（截断 12）。
 *
 * 复用函数（不私有）便于未来 SessionSearch / SessionMenu 引用。
 */
export function sessionRowTitle(session: SessionInfo): string {
  if (session.name && session.name.length > 0) return session.name
  const trimmed = session.firstMessage.trim()
  if (trimmed.length > 0) {
    return trimmed.length > TITLE_MAX_CHARS ? `${trimmed.slice(0, TITLE_MAX_CHARS)}\u2026` : trimmed
  }
  return session.id.slice(0, 12)
}

/**
 * Format message count for display. Locale-aware via Intl. PR.A 用 'en-US'
 * 占位；Phase 2+ 接入 useI18n() 用 locale。
 */
function formatMessageCount(count: number): string {
  return new Intl.NumberFormat('en-US').format(count)
}

/**
 * Format modified time as a short relative string ("5m", "2h", "3d", …).
 * PR.A uses Intl.RelativeTimeFormat with 'en-US' locale; Phase 2+ swaps to
 * useI18n()'s locale + pi-web's `formatShortRelativeTime` helper.
 *
 * Why en-US short relative (not absolute date): pi-web pattern (sidebar shows
 * "5m" / "2h" / "3d" so users see recency at a glance without parsing ISO).
 */
function formatModifiedRelative(modified: Date, now: Date = new Date()): string {
  const diffMs = modified.getTime() - now.getTime()
  const diffSec = Math.round(diffMs / 1000)
  const diffMin = Math.round(diffSec / 60)
  const diffHour = Math.round(diffMin / 60)
  const diffDay = Math.round(diffHour / 24)
  const rtf = new Intl.RelativeTimeFormat('en-US', { numeric: 'auto' })
  if (Math.abs(diffDay) >= 1) return rtf.format(diffDay, 'day')
  if (Math.abs(diffHour) >= 1) return rtf.format(diffHour, 'hour')
  if (Math.abs(diffMin) >= 1) return rtf.format(diffMin, 'minute')
  return rtf.format(diffSec, 'second')
}

export interface SessionTreeRowProps {
  session: SessionInfo
  selected: boolean
  /** No-arg handler — caller closes over which session via composition
   *  (parent row in <SessionTree> renders a fresh handler per row that
   *  calls its parent's onSelectSession(id)). Per plan §1A.5. */
  onSelect: () => void
}

export function SessionTreeRow({
  session,
  selected,
  onSelect,
}: SessionTreeRowProps): React.JSX.Element {
  const title = sessionRowTitle(session)
  const messageCountLabel = formatMessageCount(session.messageCount)
  const modifiedLabel = formatModifiedRelative(session.modified)

  return (
    <div
      className={`flex h-[${SESSION_TREE_ROW_HEIGHT_PX}px] items-center gap-2 border-b px-2 text-sm transition-colors hover:bg-accent/40`}
      data-component="session-tree-row"
      data-session-id={session.id}
      title={`cwd: ${session.cwd}`}
    >
      <button
        type="button"
        className={`flex h-full min-w-0 flex-1 items-center gap-2 text-left ${selected ? 'bg-accent/60' : ''}`}
        aria-current={selected ? 'true' : undefined}
        onClick={onSelect}
      >
        <span className="min-w-0 flex-1 truncate" title={session.name ?? session.firstMessage}>
          {title}
        </span>
        <output
          className="shrink-0 text-xs text-muted-foreground tabular-nums"
          aria-label={`${session.messageCount} messages`}
        >
          {messageCountLabel}
        </output>
        <output
          className="shrink-0 text-xs text-muted-foreground tabular-nums"
          aria-label={`modified ${modifiedLabel}`}
        >
          {modifiedLabel}
        </output>
      </button>
    </div>
  )
}
