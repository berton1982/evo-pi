'use client'

import type { SessionInfo } from '@earendil-works/pi-coding-agent'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef } from 'react'

import { SESSION_TREE_ROW_HEIGHT_PX, SessionTreeRow } from '@/features/sessions/session-tree-row'

/**
 * SessionTree — Phase 1 PR.A 真实列表（virtualized）。
 *
 * PR.A scope：
 * - 接受 sessions 数组 + onSelectSession handler
 * - @tanstack/react-virtual 渲染（DOM 中只 mount 可见行）
 * - 54px 固定行高（per study #1 §4.1）
 * - 空态显示 "No sessions yet" 占位
 *
 * 未实现（后续 phase）：
 * - 拖拽排序 / 重命名 / archive / 子 agent 关系（per pi-web study #1）
 * - 搜索过滤（PR.B/C 后）
 * - i18n（PR.A 用硬编码英文；Phase 2+ 接入 useI18n）
 *
 * Sidebar 兼容：所有 props optional，Phase 0 call site `<SessionTree />` 仍然 compile，
 * 渲染空态。1A.6 由 Sidebar 提供真实 sessions 数据。
 */

export interface SessionTreeProps {
  sessions?: SessionInfo[]
  selectedSessionId?: string
  onSelectSession?: (id: string) => void
}

const SCROLL_OVERSCAN_PX = 240 // per pi-web OVERSCAN_PX

export function SessionTree({
  sessions = [],
  selectedSessionId,
  onSelectSession = () => {},
}: SessionTreeProps): React.JSX.Element {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: sessions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => SESSION_TREE_ROW_HEIGHT_PX,
    // overscan in ITEMS (not pixels); @tanstack/react-virtual requires integer.
    // 240px / 54px = 4.44 → round up to 5 items per side.
    overscan: Math.ceil(SCROLL_OVERSCAN_PX / SESSION_TREE_ROW_HEIGHT_PX),
  })

  if (sessions.length === 0) {
    return (
      <div
        className="flex h-full flex-1 items-center justify-center text-sm text-muted-foreground"
        data-component="session-tree-empty"
      >
        No sessions yet
      </div>
    )
  }

  return (
    <div ref={parentRef} className="min-h-0 flex-1 overflow-y-auto" data-component="session-tree">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
        data-component="session-tree-inner"
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const session = sessions[virtualRow.index]
          if (!session) return null
          return (
            <div
              key={session.id}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
                height: `${virtualRow.size}px`,
              }}
              data-testid="virtual-row"
            >
              <SessionTreeRow
                session={session}
                selected={selectedSessionId === session.id}
                onSelect={() => onSelectSession(session.id)}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
