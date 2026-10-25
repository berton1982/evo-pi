'use client'

/**
 * @design D-U-13
 * 工具块：调用与结果分开传（`MessageView.tsx:1176`），失败时给"看该文件"的入口位。
 *
 * 折叠规则来自观测：只有 text/image 允许折叠过程（`:906`），工具块本身
 * 始终可展开——否则出错时用户没法判断是参数错还是结果错。
 */
import { useState } from 'react'

export interface ToolCallView {
  toolCallId: string
  name: string
  input?: string
  result?: string
  failed?: boolean
  /** 结果里记录的耗时（毫秒）；小于阈值不显示，避免每次调用都跳"0.02s" */
  durationMs?: number
}

/** pi-web 的阈值是"短到没有信息量就不显示"（`MessageView.tsx:736` 附近） */
export const MIN_DURATION_MS = 1000

function formatDuration(ms: number): string {
  return ms >= 10000 ? `${Math.round(ms / 1000)}s` : `${(ms / 1000).toFixed(1)}s`
}

export function ToolCallBlock({ call }: { call: ToolCallView }): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const hasDetail = Boolean(call.input || call.result)
  return (
    <div
      data-testid="chat-tool-call"
      data-tool={call.name}
      className="my-1 rounded border border-border"
    >
      <button
        type="button"
        className="flex w-full items-center gap-2 px-2 py-1 text-left text-xs"
        aria-expanded={open}
        disabled={!hasDetail}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={call.failed ? 'text-destructive' : 'text-muted-foreground'}>
          {call.failed ? '工具失败' : '工具'}
        </span>
        <span className="font-mono">{call.name}</span>
        {call.durationMs && call.durationMs >= MIN_DURATION_MS ? (
          <span data-testid="chat-tool-duration" className="text-muted-foreground">
            {formatDuration(call.durationMs)}
          </span>
        ) : null}
        {hasDetail ? <span className="ml-auto">{open ? '收起' : '展开'}</span> : null}
      </button>
      {open ? (
        <div className="border-t border-border p-2 font-mono text-[11px]">
          {call.input ? <pre data-testid="chat-tool-input">{call.input}</pre> : null}
          {call.result ? <pre data-testid="chat-tool-result">{call.result}</pre> : null}
        </div>
      ) : null}
    </div>
  )
}
