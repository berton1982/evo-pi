'use client'
// 客户端组件/钩子：这里用 state、effect、事件处理器。显式声明比靠父层推导安全——
// 一旦有人把它 import 进服务端组件，Next 会在构建期报错，而不是运行时才炸。
/**
 * @design D-U-03
 * @design C-01
 *
 * 容器（container）：唯一碰 store 与端口的地方。
 *
 * 依赖全部从 props 注入（`actions` / `overview` / `selection`），不在这里 import 适配器：
 * 组合根负责把 HTTP 适配器装进 use-case，容器只做「读 store → 调动作 → 写回 store」。
 * 这样容器测试不需要起 HTTP，也不需要在测试里 mock 全局 fetch。
 */

import type { McpError, McpServerSummary, McpTestResult, Translate } from '@evo-pi/core/mcp'
import { serverKey } from '@evo-pi/core/mcp'
import { useCallback } from 'react'
import { McpPanelView } from '@/features/mcp/mcp-panel-view'

export interface McpPanelProps {
  loading: boolean
  error: McpError | null
  servers: McpServerSummary[]
  groups: Array<{ scope: 'user' | 'project'; servers: McpServerSummary[] }>
  selectedKey: string | null
  testResults: Record<string, McpTestResult>
  testRunning: string[]
  home: string
  root: string
  t: Translate
  onSelect: (key: string | null) => void
  onToggle: (server: McpServerSummary, enabled: boolean) => void
  onToggleGroup: (servers: McpServerSummary[], enabled: boolean) => void
  onTest: (server: McpServerSummary) => void
  onRefresh?: () => void
  onRemove?: (server: McpServerSummary) => void
  addOpen?: boolean
  setAddOpen?: (open: boolean) => void
  /** 空态（一条 server 都没有）时由视图渲染引导与就地添加表单 */
  configPaths?: { user: string; project: string | null }
  onAdd?: (input: {
    name: string
    scope: 'user' | 'project'
    command?: string
    url?: string
  }) => void
  addPending?: boolean
  addError?: string | null
}

export function McpPanel(props: McpPanelProps) {
  const {
    servers,
    selectedKey,
    testResults,
    testRunning,
    onSelect,
    onToggle,
    onToggleGroup,
    onTest,
  } = props
  const selected = servers.find((s) => serverKey(s) === selectedKey) ?? null
  const handleSelect = useCallback(
    (server: McpServerSummary) => onSelect(serverKey(server)),
    [onSelect],
  )
  const handleToggle = useCallback(
    (server: McpServerSummary, enabled: boolean) => onToggle(server, enabled),
    [onToggle],
  )

  return (
    <McpPanelView
      loading={props.loading}
      error={props.error}
      groups={props.groups}
      selectedKey={selectedKey}
      selected={selected}
      testResult={selected ? testResults[serverKey(selected)] : undefined}
      testRunning={selected ? testRunning.includes(serverKey(selected)) : false}
      home={props.home}
      root={props.root}
      t={props.t}
      onSelect={handleSelect}
      onToggle={handleToggle}
      onToggleGroup={onToggleGroup}
      onTest={onTest}
      configPaths={props.configPaths}
      onRefresh={props.onRefresh}
      onRemove={props.onRemove}
      addOpen={props.addOpen ?? false}
      setAddOpen={props.setAddOpen}
      testResults={testResults}
      onAdd={props.onAdd}
      addPending={props.addPending ?? false}
      addError={props.addError ?? null}
    />
  )
}
