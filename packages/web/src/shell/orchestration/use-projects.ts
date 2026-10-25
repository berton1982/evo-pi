'use client'

import { useCallback, useEffect, useState } from 'react'

/**
 * 已知项目清单（壳级）。
 *
 * 数据源是服务端的 `trust.json`（这台机器上被信任/用过的目录），不是客户端扫描：
 * 浏览器没有权限读整盘，也不该让任意路径成为"探测"入口。
 *
 * 首次渲染不请求：壳在入口页就要出画面，项目清单晚一拍到没有关系（按钮先显示当前项目）。
 */
export interface ProjectVersion {
  web: string
  core: string
}

export function useProjectVersion(): ProjectVersion | null {
  const [version, setVersion] = useState<ProjectVersion | null>(null)
  // 挂载即拉一次（按钮的读屏名要带版本号，等于 pi-web 的"名称，版本：…"）：
  // 版本号在会话期间不会变，所以拉一次就够，不轮询
  useEffect(() => {
    if (version) return
    let cancelled = false
    void fetch('/api/version')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: ProjectVersion | null) => {
        if (!cancelled && data) setVersion(data)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [version])
  return version
}

export function useProjects(currentCwd: string | null): {
  projects: string[]
  open: boolean
  setOpen: (v: boolean) => void
  reload: () => void
} {
  const [projects, setProjects] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const [_nonce, setNonce] = useState(0)

  const reload = useCallback(() => setNonce((n) => n + 1), [])

  useEffect(() => {
    if (!open) return
    let stale = false
    fetch('/api/project-trust')
      .then((res) => res.json() as Promise<{ projects?: string[] }>)
      .then((body) => {
        if (stale) return
        const list = body.projects ?? []
        // 当前 cwd 一定在列表里（它可能还没被写进 trust.json）
        setProjects(currentCwd && !list.includes(currentCwd) ? [currentCwd, ...list] : list)
      })
      .catch(() => {
        if (!stale) setProjects(currentCwd ? [currentCwd] : [])
      })
    return () => {
      stale = true
    }
  }, [open, currentCwd])

  return { projects, open, setOpen, reload }
}

/**
 * 校验一个手输路径能不能当项目根：用 `/api/cwd/files` 探一次（读得到目录才算可用）。
 * 为什么不新开 `/api/projects/validate`：能读目录 = 能当项目，判据与文件树完全一致，
 * 多一条路由就多一处可以漂的判据。
 */
export async function validateProjectPath(path: string): Promise<string | null> {
  const trimmed = path.trim()
  if (!trimmed) return 'EMPTY'
  if (!trimmed.startsWith('/')) return 'NOT_ABSOLUTE'
  const res = await fetch(`/api/cwd/files?cwd=${encodeURIComponent(trimmed)}`)
  if (!res.ok) return 'UNREADABLE'
  const body = (await res.json()) as { entries?: unknown[]; error?: { message?: string } }
  if (body.error) return 'UNREADABLE'
  return null
}

/** 路径简化：只显示最后一段，悬停/读屏拿全路径（pi-web 的按钮就是这么显示的） */
export const shortPath = (p: string): string => p.split('/').filter(Boolean).pop() ?? p
