'use client'
// 客户端组件/钩子：这里用 state、effect、事件处理器。显式声明比靠父层推导安全——
// 一旦有人把它 import 进服务端组件，Next 会在构建期报错，而不是运行时才炸。
/**
 * @design D-U-06
 * @design C-04
 *
 * 服务器详情（presenter）：名字、作用域、来源路径、测试入口与结果。
 *
 * 为什么来源路径要显示：同一个名字可能在 user 与 project 两个作用域各有一份，
 * 不显示来源用户会改错文件（pi-web 的 `displayPath` 就是为此存在，`McpConfig.tsx:187`）。
 */

import type { McpServerSummary, McpTestResult } from '@evo-pi/core/mcp'
import { displayPath, scopeLabel, type Translate } from '@evo-pi/core/mcp'
import { McpTestStatus } from '@/features/mcp/mcp-test-status'

export interface McpServerDetailProps {
  server: McpServerSummary
  result?: McpTestResult
  running: boolean
  home: string
  root: string
  t: Translate
  onTest: (server: McpServerSummary) => void
  /** 移除：破坏性动作，容器负责回读与清选中 */
  onRemove?: (server: McpServerSummary) => void
}

export function McpServerDetail({
  server,
  result,
  running,
  home,
  root,
  t,
  onTest,
  onRemove,
}: McpServerDetailProps) {
  return (
    <section
      className="flex min-w-0 flex-col gap-3 rounded-md border border-border p-3"
      data-testid="mcp-detail"
    >
      <header className="flex items-center gap-2">
        <h3 className="text-sm font-medium" data-testid="mcp-detail-name">
          {server.name}
        </h3>
        <span
          className="text-muted-foreground rounded border border-border px-1 text-[10px]"
          data-testid="mcp-detail-scope"
        >
          {scopeLabel(server.scope, t)}
        </span>
        <button
          className="bg-primary text-primary-foreground hover:bg-primary/90 ml-auto rounded px-2 py-1 text-xs disabled:opacity-50"
          disabled={running}
          onClick={() => onTest(server)}
          type="button"
        >
          {t('mcp.test.button')}
        </button>
        {/* 移除放在最后：破坏性动作不要紧挨着「测试连接」，手滑代价不同 */}
        <button
          className="text-muted-foreground hover:text-destructive rounded border border-border px-2 py-1 text-xs"
          onClick={() => onRemove?.(server)}
          type="button"
        >
          {t('mcp.remove')}
        </button>
      </header>
      <dl className="grid grid-cols-[auto_1fr] items-baseline gap-x-3 gap-y-1 text-xs">
        <dt className="text-muted-foreground">{t('mcp.detail.config')}</dt>
        <dd className="truncate">
          <code className="font-mono" data-testid="mcp-detail-path">
            {displayPath(server.sourcePath, home, root)}
          </code>
        </dd>
      </dl>
      <McpTestStatus result={result} running={running} t={t} />
    </section>
  )
}
