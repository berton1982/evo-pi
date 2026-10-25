'use client'

/**
 * @design C-08
 * 会话信息面板（顶栏右侧按钮弹出）：`AppShell.tsx:1860` 是入口，`:2038` 是弹层动画。
 * 只读展示，不提供编辑（改标题属于 C-B 的会话编排）。
 */
export interface SessionInfoView {
  title: string
  entryCount: number
  cwd: string | null
  updatedAt?: number
}

export function SessionInfoPanel({
  info,
  onClose,
}: {
  info: SessionInfoView
  onClose?: () => void
}): React.JSX.Element {
  return (
    <section
      data-testid="chat-session-info-panel"
      aria-label="会话信息"
      className="rounded border border-border p-3 text-xs"
    >
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-semibold">会话信息</h3>
        {onClose ? (
          <button type="button" onClick={onClose} aria-label="关闭会话信息">
            ×
          </button>
        ) : null}
      </div>
      <dl className="space-y-1">
        <div className="flex gap-2">
          <dt className="text-muted-foreground">标题</dt>
          <dd>{info.title}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-muted-foreground">条目</dt>
          <dd>{info.entryCount}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-muted-foreground">工作目录</dt>
          <dd className="truncate font-mono">{info.cwd ?? '—'}</dd>
        </div>
        {info.updatedAt ? (
          <div className="flex gap-2">
            <dt className="text-muted-foreground">更新于</dt>
            <dd>{new Date(info.updatedAt).toLocaleString()}</dd>
          </div>
        ) : null}
      </dl>
    </section>
  )
}
