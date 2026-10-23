'use client'

/**
 * 会话列表标签页（能力内部实现）。
 *
 * 为什么搜索框由壳控制"是否显示"、本文件只持有 query：
 * - 触发搜索的按钮在 SidebarHeader（壳的布局），壳不 import 能力；
 * - query 是能力语义（影响过滤结果），必须留在能力内。
 * 这样壳只传 `searchOpen` + `onQueryChange`，不需要 effect 去清空状态
 * （清理放在壳的回调里：关闭搜索时 `setQuery('')` 一次即可）。
 */

import { useMemo } from 'react'
import { SessionTree } from './session-tree'
import { SidebarSearchInput } from './sidebar-search-input'
import { useSessionList } from './use-session-list'
import { useSessionSearch } from './use-session-search'

interface SessionsTabProps {
  searchOpen: boolean
  query: string
  onQueryChange: (query: string) => void
  selectedSessionId?: string
  onSelectSession: (id: string) => void
}

export function SessionsTab({
  searchOpen,
  query,
  onQueryChange,
  selectedSessionId,
  onSelectSession,
}: SessionsTabProps): React.JSX.Element {
  const { data: sessions } = useSessionList()
  // 防抖在 hook 内（200ms），这里传原始 query
  const { data: searchData } = useSessionSearch(query)

  // 过滤而不是另开结果面板：侧栏只有一个滚动区，双列表会造成双滚动
  const filteredSessions = useMemo(() => {
    const list = sessions ?? []
    const trimmed = query.trim()
    if (trimmed === '' || !searchData) return list
    const matched = new Set(searchData.results.map((r) => r.session.id))
    return list.filter((s) => matched.has(s.id))
  }, [sessions, query, searchData])

  return (
    <div className="flex h-full flex-col" data-component="sessions-tab">
      {searchOpen ? <SidebarSearchInput value={query} onChange={onQueryChange} /> : null}
      <SessionTree
        sessions={filteredSessions}
        selectedSessionId={selectedSessionId}
        onSelectSession={onSelectSession}
      />
    </div>
  )
}
