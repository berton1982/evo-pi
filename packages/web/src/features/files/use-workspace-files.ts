'use client'

import type { WorkspaceEntry } from '@evo-pi/core/files'
import { useCallback, useEffect, useState } from 'react'

/**
 * 文件树的数据源（能力内部 hook）。
 *
 * 只列一层：展开某个目录时再请求它的子层（并把结果挂到 `childrenOf`），
 * 不在前端做整树递归——大仓库首次渲染会很慢，且用户根本不会看完。
 *
 * 失败时把 `error` 交给界面显示原因：目录读不了和"目录是空的"必须能区分，
 * 否则用户会以为文件丢了。
 */
export interface WorkspaceFilesState {
  entries: WorkspaceEntry[]
  childrenOf: Record<string, WorkspaceEntry[]>
  expanded: ReadonlySet<string>
  loading: boolean
  error: { code: string; message?: string } | null
  toggle: (path: string) => void
  refresh: () => void
}

export function useWorkspaceFiles(
  cwd: string | null,
  opts: { showIgnored: boolean },
): WorkspaceFilesState {
  const [entries, setEntries] = useState<WorkspaceEntry[]>([])
  const [childrenOf, setChildrenOf] = useState<Record<string, WorkspaceEntry[]>>({})
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<{ code: string; message?: string } | null>(null)
  const [_nonce, setNonce] = useState(0)

  const fetchLayer = useCallback(
    async (path: string) => {
      const params = new URLSearchParams({ cwd: cwd ?? '' })
      if (path) params.set('path', path)
      if (opts.showIgnored) params.set('hidden', '1')
      const res = await fetch(`/api/cwd/files?${params.toString()}`)
      const body = (await res.json()) as {
        entries: WorkspaceEntry[]
        error?: { code: string; message?: string }
      }
      return body
    },
    [cwd, opts.showIgnored],
  )

  // 根目录：cwd 变化或手动刷新时重拉，并清空展开态（旧 cwd 的子层没有意义）
  useEffect(() => {
    if (!cwd) {
      setEntries([])
      return
    }
    let stale = false
    setLoading(true)
    fetchLayer('')
      .then((body) => {
        if (stale) return
        setEntries(body.entries)
        setError(body.error ?? null)
        setChildrenOf({})
        setExpanded(new Set())
      })
      .catch((err: unknown) => {
        if (!stale) setError({ code: 'internal', message: String(err) })
      })
      .finally(() => {
        if (!stale) setLoading(false)
      })
    return () => {
      stale = true
    }
  }, [cwd, fetchLayer])

  const toggle = useCallback(
    (path: string) => {
      setExpanded((prev) => {
        const next = new Set(prev)
        if (next.has(path)) {
          next.delete(path)
          return next
        }
        next.add(path)
        // 首次展开才请求；折叠不清缓存（再次展开是瞬时的）
        if (!childrenOf[path]) {
          void fetchLayer(path).then((body) => {
            setChildrenOf((c) => ({ ...c, [path]: body.entries }))
            if (body.error) setError(body.error)
          })
        }
        return next
      })
    },
    [childrenOf, fetchLayer],
  )

  return {
    entries,
    childrenOf,
    expanded,
    loading,
    error,
    toggle,
    refresh: () => setNonce((n) => n + 1),
  }
}
