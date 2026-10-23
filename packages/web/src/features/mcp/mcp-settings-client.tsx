'use client'

/**
 * MCP 能力在设置弹窗里的分区组件。
 *
 * 这里只做两件事：把 hook 给的数据摆到 `McpPanel` 上、把动作接上。
 * 状态与端口装配在 `use-mcp-settings-panel.ts`——组件超过 200 行时
 * 先怀疑"是不是又在组件里装了一遍应用"。
 */

import type { McpError, McpServerSummary } from '@evo-pi/core/mcp'
import { McpPanel } from '@/features/mcp/mcp-panel'
import { useMcpSettingsPanel } from '@/features/mcp/use-mcp-settings-panel'

export function McpSettingsClient({
  cwd,
  initialServers,
  initialError,
  configPaths,
}: {
  cwd: string | null
  initialServers: McpServerSummary[] | null
  initialError: McpError | null
  /** 挂进设置弹窗时由本组件自己取（弹窗是客户端组件，算不出服务端的绝对路径） */
  configPaths?: { user: string; project: string | null }
}): React.JSX.Element {
  const panel = useMcpSettingsPanel({ cwd, initialServers, initialError, configPaths })

  return (
    <div data-component="mcp-settings">
      <h2 className="mb-3 text-base font-semibold">{panel.t('mcp.title')}</h2>
      <McpPanel
        loading={panel.loading}
        error={panel.overviewError}
        servers={panel.servers}
        groups={panel.groups}
        selectedKey={panel.selectedKey}
        testResults={panel.testResults}
        testRunning={panel.testRunning}
        home=""
        root={cwd ?? ''}
        t={panel.t}
        onSelect={panel.select}
        onToggle={panel.onToggle}
        onToggleGroup={panel.onToggleGroup}
        onTest={panel.onTest}
        configPaths={panel.paths ?? undefined}
        onRefresh={panel.onRefresh}
        onRemove={panel.onRemove}
        addOpen={panel.addOpen}
        setAddOpen={panel.setAddOpen}
        onAdd={panel.onAdd}
        addPending={panel.addPending}
        addError={panel.addError}
      />
    </div>
  )
}
