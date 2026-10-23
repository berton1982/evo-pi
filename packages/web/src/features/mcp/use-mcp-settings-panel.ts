'use client'

/**
 * MCP 设置面板的状态与动作（从组件里抽出来的那 150 行）。
 *
 * 抽出来的理由不是"为了短"，而是：组件一旦同时持有
 * 端口装配、两段首屏加载、四个动作、几十个 store 选择器，
 * 它就成了"什么都知道"的 god——加一个动作就要重读全文。
 * 现在组件只回答"画什么"，这里回答"数据从哪来、点了发生什么"。
 */

// 类型与 HTTP 适配器都在 core（adapters 不住 web），web 只装配
import type { McpError, McpServerSummary } from '@evo-pi/core/mcp'
import {
  createHttpMcpRepository,
  createHttpMcpSignIn,
  createHttpMcpTestRunner,
  createHttpProjectTrust,
  createRemoveServer,
  serverKey,
} from '@evo-pi/core/mcp'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AddServerInput } from '@/features/mcp/mcp-empty-state'
import { useMcpGroups, useMcpOverviewStore } from '@/features/mcp/stores/mcp-overview-store'
import { useMcpSelectionStore } from '@/features/mcp/stores/mcp-selection-store'
import { useMcpTestStore } from '@/features/mcp/stores/mcp-test-store'
import { createMcpActions } from '@/features/mcp/use-mcp-actions'
import { createMcpOverview } from '@/features/mcp/use-mcp-overview'
import { getMessagesByLocale, translateMessage } from '@/lib/i18n'
import { useLocaleStore } from '@/shell/orchestration/stores/use-locale-store'

export function useMcpSettingsPanel({
  cwd,
  initialServers,
  initialError,
  configPaths,
}: {
  cwd: string | null
  initialServers: McpServerSummary[] | null
  initialError: McpError | null
  configPaths?: { user: string; project: string | null }
}) {
  const locale = useLocaleStore((s) => s.locale)
  const messages = useMemo(() => getMessagesByLocale(), [])
  const t = useCallback(
    (key: string, params?: Record<string, string | number>) =>
      translateMessage(locale, key, messages, params),
    [locale, messages],
  )

  const servers = useMcpOverviewStore((s) => s.overview)
  const loading = useMcpOverviewStore((s) => s.loading)
  const overviewError = useMcpOverviewStore((s) => s.overviewError)
  const setOverview = useMcpOverviewStore((s) => s.setOverview)
  const setLoading = useMcpOverviewStore((s) => s.setLoading)
  const groups = useMcpGroups()
  const selectedKey = useMcpSelectionStore((s) => s.selectedKey)
  const select = useMcpSelectionStore((s) => s.select)
  const testResults = useMcpTestStore((s) => s.results)
  const testRunning = useMcpTestStore((s) => s.running)
  const setUndo = useMcpTestStore((s) => s.setUndo)
  const setResult = useMcpTestStore((s) => s.setResult)
  const startTest = useMcpTestStore((s) => s.start)
  const finishTest = useMcpTestStore((s) => s.finish)

  const { actions, loader, repo, remover } = useMemo(() => {
    const repository = createHttpMcpRepository()
    const tests = createHttpMcpTestRunner()
    const trust = createHttpProjectTrust()
    // 签到端口这轮没有 UI，仍构造以便后续接入（不要删，删了接线时要重新翻接口）
    createHttpMcpSignIn()
    return {
      actions: createMcpActions({ repo: repository, tests, trust, cwd }),
      loader: createMcpOverview({ repo: repository, cwd }),
      repo: repository,
      // 移除单独走用例：它是破坏性动作，调用方要显式拿到结果再决定界面怎么收
      remover: createRemoveServer({ repository }),
    }
  }, [cwd])

  // 首屏数据由服务端给；只有拿不到时才回退到浏览器取一次
  useEffect(() => {
    if (initialServers !== null) {
      setOverview(initialServers, initialError ?? null)
      return
    }
    let cancelled = false
    setLoading(true)
    loader.refresh().then((res) => {
      if (cancelled || !res) return
      if (res.ok) setOverview((res.value as McpServerSummary[]) ?? [])
      else setOverview(null, res.error ?? null)
    })
    return () => {
      cancelled = true
    }
  }, [initialServers, initialError, loader, setLoading, setOverview])

  // 弹窗里没有服务端渲染，配置路径要自己取一次（GET /api/mcp 的 paths 字段）
  const [paths, setPaths] = useState(configPaths ?? null)
  useEffect(() => {
    if (paths) return
    let cancelled = false
    const q = cwd ? `?cwd=${encodeURIComponent(cwd)}` : ''
    fetch(`/api/mcp${q}`)
      .then((r) => r.json() as Promise<{ paths?: { user: string; project: string | null } }>)
      .then((body) => {
        if (!cancelled && body.paths) setPaths(body.paths)
      })
      .catch(() => {
        // 拿不到路径就不显示"配置文件在哪"，列表与开关照常可用
      })
    return () => {
      cancelled = true
    }
  }, [cwd, paths])

  // 添加表单默认收起：pi-web 是「添加 MCP」按钮展开，空态时才直接摊开
  const [addOpen, setAddOpen] = useState(false)
  const [addPending, setAddPending] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  const onAdd = useCallback(
    async (input: AddServerInput) => {
      setAddPending(true)
      setAddError(null)
      const res = await repo.add(
        {
          ref: { scope: input.scope, name: input.name },
          ...(input.command ? { command: input.command } : {}),
          ...(input.url ? { url: input.url } : {}),
        },
        cwd,
      )
      setAddPending(false)
      if (!res.ok) {
        setAddError(res.error?.message ?? t('mcp.add.failed'))
        return
      }
      setOverview(res.value?.servers ?? [])
      select(serverKey({ scope: input.scope, name: input.name }))
    },
    [repo, cwd, setOverview, select, t],
  )

  /** 刷新：只在有人点的时候才拉，避免把"自动轮询"变成隐性开销 */
  const onRefresh = useCallback(async () => {
    setLoading(true)
    const res = await loader.refresh()
    if (res?.ok) setOverview((res.value as McpServerSummary[]) ?? [])
    else setOverview(null, res?.error ?? null)
    setLoading(false)
  }, [loader, setOverview, setLoading])

  const onRemove = useCallback(
    async (server: McpServerSummary) => {
      const key = serverKey(server)
      const res = await remover.remove(server, cwd)
      if (!res.ok) {
        setOverview(null, (res.error as McpError) ?? null)
        return
      }
      const next = (servers ?? []).filter((s) => serverKey(s) !== key)
      setOverview(next)
      // 删掉的正是选中项时要清空选中，否则详情区还挂着一个不存在的 server
      if (selectedKey === key) select(null)
    },
    [remover, cwd, servers, selectedKey, select, setOverview],
  )

  const onToggle = useCallback(
    async (server: McpServerSummary, enabled: boolean) => {
      const key = serverKey(server)
      const before = servers ?? []
      // 乐观写：先按用户意图改本地，失败再回滚到服务端已知状态
      setOverview(before.map((s) => (serverKey(s) === key ? { ...s, enabled } : s)))
      const res = await actions.toggle(server, enabled)
      if (!res.ok) setOverview(before)
      else setUndo({ key, enabled, expiresAt: Date.now() + 8_000 })
    },
    [actions, servers, setOverview, setUndo],
  )

  const onToggleGroup = useCallback(
    async (group: McpServerSummary[], enabled: boolean) => {
      await actions.toggleGroup(group, enabled)
      // 必须回读：批量在服务端逐条写，本地猜容易与磁盘不一致
      const res = await loader.refresh()
      if (res?.ok) setOverview((res.value as McpServerSummary[]) ?? [])
    },
    [actions, loader, setOverview],
  )

  const onTest = useCallback(
    async (server: McpServerSummary) => {
      const key = serverKey(server)
      startTest(key)
      const res = await actions.test(server)
      finishTest(key)
      if (res.ok && res.value) setResult(key, res.value)
    },
    [actions, startTest, finishTest, setResult],
  )

  return {
    t,
    addOpen,
    setAddOpen,
    onRefresh,
    onRemove,
    servers: servers ?? [],
    loading,
    overviewError,
    groups,
    selectedKey,
    select,
    testResults,
    testRunning,
    paths,
    addPending,
    addError,
    onAdd,
    onToggle,
    onToggleGroup,
    onTest,
  }
}
