'use client'

/**
 * 会话页的编排状态（应用级状态机的一部分，不属于任何能力）。
 *
 * 抽出来的理由：页面本身必须是"装配文件"（≤60 行）。
 * 这里只放跨能力的应用级状态——选中会话（URL 是唯一事实源）、
 * 设置弹窗的开合与初始分区、搜索框的开合与查询串。
 */

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useState } from 'react'
import type { SettingsSection } from '@/shell/layout/settings-panel'
import type { SidebarFooterSection } from '@/shell/layout/sidebar-footer'
import { topDialog, useDialogStack } from './dialog-stack'

const FOOTER_TO_SECTION: Record<SidebarFooterSection, SettingsSection> = {
  models: 'models',
  skills: 'skills',
  settings: 'general',
}

export type SessionPage = ReturnType<typeof useSessionsPage>

export function useSessionsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  // 设置弹窗走 shell 级对话框栈：栈是"谁在最上面"的唯一答案（见 dialog-stack.ts）
  const stack = useDialogStack((s) => s.stack)
  const pushDialog = useDialogStack((s) => s.push)
  const popDialog = useDialogStack((s) => s.pop)
  const top = topDialog(stack)
  const settingsOpen = top?.id === 'settings'
  const initialSection = (top?.payload?.section as SettingsSection | undefined) ?? null
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // URL 是选中态的唯一事实源：刷新、深链、前进后退都靠它
  const selectedSessionId = searchParams.get('session') ?? undefined
  const cwd = searchParams.get('cwd')

  /**
   * 新建会话：POST 只发号（pi SDK 的会话文件在第一条消息时才产生），
   * 拿到 id 直接进 URL——刷新后还是这个新会话，不需要前端另存一份。
   */
  const createSession = useCallback(async () => {
    const target = cwd ?? undefined
    if (!target) return
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ cwd: target }),
    })
    if (!res.ok) return
    const body = (await res.json()) as { session?: { id?: string } }
    const id = body.session?.id
    if (!id) return
    const params = new URLSearchParams(searchParams.toString())
    params.set('cwd', target)
    params.set('session', id)
    router.replace(`/sessions?${params.toString()}`, { scroll: false })
  }, [cwd, router, searchParams])

  /**
   * 换项目：URL 的 cwd 是唯一事实源，换项目必须同时丢掉旧 session——
   * 旧会话不属于新项目，留着会在新项目里显示一个"找不到"的详情。
   */
  const selectProject = useCallback(
    (next: string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('cwd', next)
      params.delete('session')
      router.replace(`/sessions?${params.toString()}`, { scroll: false })
    },
    [router, searchParams],
  )

  const selectSession = useCallback(
    (id: string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('session', id)
      // replace 而不是 push：连续点击不堆积历史；前进后退仍然可用
      router.replace(`/sessions?${params.toString()}`, { scroll: false })
    },
    [router, searchParams],
  )

  const openSection = useCallback(
    (section: SettingsSection) => {
      // 同一 id 再次 push 是"置顶"而不是叠两层（dialog-stack 内已处理）
      pushDialog({ id: 'settings', payload: { section } })
    },
    [pushDialog],
  )

  const openFromFooter = useCallback(
    (section: SidebarFooterSection) => {
      openSection(FOOTER_TO_SECTION[section])
    },
    [openSection],
  )

  return {
    cwd,
    selectedSessionId,
    selectSession,
    selectProject,
    createSession,
    settingsOpen,
    initialSection,
    closeSettings: () => {
      popDialog()
    },
    openSection,
    openFromFooter,
    searchOpen,
    searchQuery,
    toggleSearch: () => {
      setSearchOpen((open) => {
        // 关闭搜索时清空查询，否则会话树会保持"被过滤"的样子
        if (open) setSearchQuery('')
        return !open
      })
    },
    setSearchQuery,
  }
}
