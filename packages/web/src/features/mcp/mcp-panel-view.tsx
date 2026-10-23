'use client'
// 客户端组件/钩子：这里用 state、effect、事件处理器。显式声明比靠父层推导安全——
// 一旦有人把它 import 进服务端组件，Next 会在构建期报错，而不是运行时才炸。
/**
 * @design D-U-04
 * @design C-02
 *
 * 整页视图（presenter）：左列表 + 右详情 + 顶部错误条。
 *
 * 为什么容器和视图分开：视图是"给定数据画什么"的纯函数式组件，能被四个状态直接测（加载/整体失败/空/有数据）；
 * 容器（C-01）才碰 store 与端口。pi-web 把两者写在一个 2258 行文件里，导致每个状态都要整页渲染。
 */

import type { McpError, McpServerSummary, McpTestResult } from '@evo-pi/core/mcp'
import { failureText, type Translate } from '@evo-pi/core/mcp'
import { type AddServerInput, McpAddForm, McpEmptyState } from '@/features/mcp/mcp-empty-state'
import { McpServerDetail } from '@/features/mcp/mcp-server-detail'
import { McpServerList } from '@/features/mcp/mcp-server-list'

export interface McpPanelViewProps {
  loading: boolean
  error: McpError | null
  groups: Array<{ scope: 'user' | 'project'; servers: McpServerSummary[] }>
  selectedKey: string | null
  selected: McpServerSummary | null
  testResult?: McpTestResult
  /** 整张表：行名要带连接态，所以列表也需要全部结果 */
  testResults?: Record<string, McpTestResult>
  testRunning: boolean
  home: string
  root: string
  t: Translate
  onSelect: (server: McpServerSummary) => void
  onToggle: (server: McpServerSummary, enabled: boolean) => void
  onToggleGroup: (servers: McpServerSummary[], enabled: boolean) => void
  onTest: (server: McpServerSummary) => void
  configPaths?: { user: string; project: string | null }
  onAdd?: (input: AddServerInput) => void
  addPending: boolean
  addError: string | null
  /** 刷新：pi-web 有显式刷新入口，缺了它"列表是不是最新的"只能靠猜 */
  onRefresh?: () => void
  /** 移除：破坏性动作，由容器处理回读与清选中 */
  onRemove?: (server: McpServerSummary) => void
  /** 添加表单是否展开（pi-web 是点「添加 MCP」才展开） */
  addOpen?: boolean
  setAddOpen?: (open: boolean) => void
}

export function McpPanelView(props: McpPanelViewProps) {
  const { loading, error, groups, selectedKey, testResult, testRunning, t } = props
  // 一条都没有时才给引导：有 server 的人不需要看"配置在哪"
  const isEmpty = groups.every((g) => g.servers.length === 0)

  return (
    <div data-testid="mcp-panel-view">
      <PanelNotice error={error} loading={loading} t={t} />
      {!isEmpty ? <Toolbar {...props} /> : null}
      {!isEmpty && props.addOpen && props.onAdd ? (
        <div className="mb-3 rounded-md border border-border p-3">
          <McpAddForm error={props.addError} onAdd={props.onAdd} pending={props.addPending} t={t} />
        </div>
      ) : null}
      {isEmpty && props.configPaths && props.onAdd ? (
        <McpEmptyState
          error={props.addError}
          onAdd={props.onAdd}
          pending={props.addPending}
          projectPath={props.configPaths.project}
          t={t}
          userPath={props.configPaths.user}
        />
      ) : (
        <div className="grid grid-cols-[minmax(220px,1fr)_2fr] gap-4">
          <McpServerList
            groups={groups}
            onSelect={props.onSelect}
            onToggle={props.onToggle}
            onToggleGroup={props.onToggleGroup}
            selectedKey={selectedKey}
            t={t}
            testResults={props.testResults}
          />
          <DetailSlot
            home={props.home}
            onRemove={props.onRemove}
            onTest={props.onTest}
            result={testResult}
            root={props.root}
            running={testRunning}
            selected={props.selected}
            t={t}
          />
        </div>
      )}
    </div>
  )
}

/**
 * 顶部两态（失败/加载）。
 * 抽出来是因为原来三目运算符套在 JSX 里，"有没有 server"的分支被夹在中间读不出来。
 */
function PanelNotice({ error, loading, t }: { error: unknown; loading: boolean; t: Translate }) {
  if (error)
    return (
      <p data-testid="mcp-panel-error" role="alert">
        {failureText(error as never, t)}
      </p>
    )
  if (loading) return <p data-testid="mcp-panel-loading">{t('mcp.loading')}</p>
  return null
}

/** 右栏：选中详情，或"选一个"的占位 */
function DetailSlot(props: {
  selected: McpPanelViewProps['selected']
  result: McpPanelViewProps['testResult']
  running: boolean
  home: string
  root: string
  t: Translate
  onTest: (server: McpServerSummary) => void
  onRemove?: (server: McpServerSummary) => void
}) {
  if (!props.selected)
    return <p data-testid="mcp-detail-placeholder">{props.t('mcp.selectPrompt')}</p>
  return (
    <McpServerDetail
      home={props.home}
      onRemove={props.onRemove}
      onTest={props.onTest}
      result={props.result}
      root={props.root}
      running={props.running}
      server={props.selected}
      t={props.t}
    />
  )
}

/**
 * 面板工具栏：刷新 + 添加 MCP。
 *
 * 为什么单独抽出来：pi-web 的可及元素里这两个按钮是**动作入口**（`刷新` / `添加 MCP`），
 * 我们原来只有首屏数据 + 空态表单——"列表过期了""想再加一个"都没有可点的地方。
 */
function Toolbar(props: McpPanelViewProps) {
  const { t } = props
  return (
    <div className="mb-2 flex items-center justify-end gap-2">
      <button
        className="rounded border border-border px-2 py-1 text-xs hover:bg-accent"
        onClick={() => props.onRefresh?.()}
        type="button"
      >
        {t('mcp.refresh')}
      </button>
      <button
        className="rounded border border-border px-2 py-1 text-xs hover:bg-accent"
        aria-expanded={props.addOpen ? 'true' : 'false'}
        onClick={() => props.setAddOpen?.(!(props.addOpen ?? false))}
        type="button"
      >
        {t('mcp.add')}
      </button>
    </div>
  )
}
