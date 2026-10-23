'use client'
// 客户端组件/钩子：这里用 state、effect、事件处理器。显式声明比靠父层推导安全——
// 一旦有人把它 import 进服务端组件，Next 会在构建期报错，而不是运行时才炸。
/**
 * @design D-U-05
 * @design C-03
 *
 * 服务器列表（presenter）：只渲染 + 上抛意图，不自己发请求。
 *
 * 为什么是 presenter：它同时被"设置页内嵌"和"独立对话框"两处使用（pi-web 里两处各写了一遍列表），
 * 容器化后两处共享同一份渲染逻辑，测试只需给 props。
 */

import type { McpServerSummary, McpTestResult } from '@evo-pi/core/mcp'
import { groupStatusText, scopeLabel, type Translate } from '@evo-pi/core/mcp'

export interface McpServerListProps {
  groups: Array<{ scope: 'user' | 'project'; servers: McpServerSummary[] }>
  selectedKey: string | null
  t: Translate
  onSelect: (server: McpServerSummary) => void
  onToggle: (server: McpServerSummary, enabled: boolean) => void
  onToggleGroup: (servers: McpServerSummary[], enabled: boolean) => void
  /** 最近一次测试结果：行名要带「连接态」（pi-web 的行名就是 `名字：测试时已连接`） */
  testResults?: Record<string, McpTestResult>
}

export function McpServerList({
  groups,
  selectedKey,
  t,
  onSelect,
  onToggle,
  onToggleGroup,
  testResults,
}: McpServerListProps) {
  if (groups.length === 0) {
    return <p data-testid="mcp-empty">{t('mcp.empty')}</p>
  }
  return (
    <ul className="flex flex-col gap-3" data-testid="mcp-server-list">
      {groups.map((group) => {
        const allEnabled = group.servers.every((s) => s.enabled)
        return (
          <section
            className="overflow-hidden rounded-md border border-border"
            data-testid={`mcp-group-${group.scope}`}
            key={group.scope}
          >
            <header className="flex items-center gap-2 border-b border-border bg-muted/40 px-2 py-1">
              <span className="text-xs font-medium">{scopeLabel(group.scope, t)}</span>
              <span
                className="text-muted-foreground text-xs"
                data-testid={`mcp-group-status-${group.scope}`}
              >
                {groupStatusText(group.servers, t)}
              </span>
              <McpGroupToggle
                allEnabled={allEnabled}
                onToggle={() => onToggleGroup(group.servers, !allEnabled)}
                scopeLabelText={
                  group.scope === 'user' ? t('mcp.scope.global') : t('mcp.scope.project')
                }
                t={t}
              />
            </header>
            <ul className="divide-y divide-border">
              {group.servers.map((server) => (
                <McpServerRow
                  key={`${server.scope}/${server.name}`}
                  onSelect={onSelect}
                  onToggle={onToggle}
                  result={testResults?.[`${server.scope}/${server.name}`]}
                  selectedKey={selectedKey}
                  server={server}
                  t={t}
                />
              ))}
            </ul>
          </section>
        )
      })}
    </ul>
  )
}

/**
 * 单行：复选框 + 名称 + 传输标签。
 * 抽出来的理由不是"看着清爽"——原来一层 map 里嵌 section/header/ul/li/input/button/span，
 * 最深 7 层，改一处要数四层括号（reviewkit 报 deep-nesting 7 > 4）。
 */
function McpServerRow({
  server,
  selectedKey,
  t,
  onSelect,
  onToggle,
  result,
}: {
  server: McpServerSummary
  selectedKey: string | null
  t: Translate
  result?: McpTestResult
  onSelect: (server: McpServerSummary) => void
  onToggle: (server: McpServerSummary, enabled: boolean) => void
}) {
  const key = `${server.scope}/${server.name}`
  // 「连接态」= 最近一次测试结果；没测过就说没测过，不假装已连接
  const connState = result
    ? result.ok
      ? t('mcp.row.testedOk')
      : t('mcp.row.testedFail')
    : t('mcp.row.untested')
  const current = selectedKey === key
  return (
    <li
      className="hover:bg-accent/60 flex items-center gap-2 px-2 py-1.5 data-[current=true]:bg-accent"
      data-current={current}
      data-testid={`mcp-row-${key}`}
    >
      {/* 复选框 = pi-web 的逐行 switch：可及名只写动作词（关闭 X / 开启 X），状态在 checked 里 */}
      <input
        aria-label={
          server.enabled
            ? t('mcp.row.toggleOff', { name: server.name })
            : t('mcp.row.toggleOn', { name: server.name })
        }
        checked={server.enabled}
        className="accent-primary size-3.5"
        data-testid={`mcp-row-toggle-${key}`}
        onChange={(e) => onToggle(server, e.target.checked)}
        // role=switch 而不是 checkbox：pi-web 的逐行开关就是 switch，读屏读"开关"比"复选框"准确
        role="switch"
        type="checkbox"
      />
      {/* 行名 = 「名字：连接态」，对齐 pi-web（`alpha：测试时已连接`）。
          只写名字时读屏用户听不出这台服务器最近一次测试结果，保真对账把它列成了缺口。 */}
      <button
        aria-current={current}
        aria-label={`${server.name}：${connState}`}
        className="min-w-0 flex-1 truncate text-left text-sm"
        onClick={() => onSelect(server)}
        type="button"
      >
        {server.name}
      </button>
      <span
        className="text-muted-foreground rounded border border-border px-1 font-mono text-[10px] uppercase"
        data-testid={`mcp-transport-${key}`}
      >
        {server.transport}
      </span>
    </li>
  )
}

/** 分组开关：单独成组件，避免在 header 里再嵌一层按钮 JSX */
function McpGroupToggle({
  allEnabled,
  onToggle,
  t,
  scopeLabelText,
}: {
  allEnabled: boolean
  onToggle: () => void
  t: Translate
  scopeLabelText: string
}) {
  // role=switch + aria-checked：pi-web 的组头是"关闭 全局 中的所有服务器"这种可切换名称，
  // 读屏能直接说出目标与当前态；纯文本按钮只能靠标签内容猜。对账脚本把这条列为缺口。
  return (
    <button
      aria-checked={allEnabled}
      aria-label={
        allEnabled
          ? t('mcp.disableGroupAll', { scope: scopeLabelText })
          : t('mcp.enableGroupAll', { scope: scopeLabelText })
      }
      className="text-muted-foreground hover:text-foreground ml-auto text-xs underline-offset-2 hover:underline"
      onClick={onToggle}
      role="switch"
      type="button"
    >
      {allEnabled ? t('mcp.disableGroup') : t('mcp.enableGroup')}
    </button>
  )
}
