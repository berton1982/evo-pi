'use client'

/**
 * @design C-07
 * 排队区：运行中排队的消息（引导 / 追加）与"撤回全部"。
 *
 * 语义来自 `ChatWindow.tsx:52`（`'steer' | 'followUp'`）与 `chat.steerHint`：
 * 引导在本轮响应与工具调用结束后投递，追加作为下一轮消息；停止会打断两者。
 * 配色区分来自 `QueuedMessageRow`（`:522`）：引导 accent 边、追加 dim 边。
 */
export interface QueuedItem {
  id: string
  text: string
  mode: 'steer' | 'followUp'
}

export function ComposerQueue({
  items,
  onRecall,
}: {
  items: QueuedItem[]
  onRecall?: () => void
}): React.JSX.Element | null {
  if (items.length === 0) return null
  return (
    <section data-testid="chat-queue" aria-label="排队中的消息" className="space-y-1 px-3 py-1">
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>排队中 · {items.length}</span>
        {onRecall ? (
          <button
            type="button"
            data-testid="chat-queue-recall"
            onClick={onRecall}
            title="把排队的消息放回输入框"
          >
            ↺ 撤回全部
          </button>
        ) : null}
      </div>
      {items.map((item) => (
        <div
          key={item.id}
          data-testid="chat-queue-item"
          data-mode={item.mode}
          className={`truncate rounded border-l-2 px-2 py-1 text-xs ${
            item.mode === 'steer' ? 'border-accent' : 'border-muted-foreground/40'
          }`}
        >
          {item.mode === 'steer' ? '引导' : '追加'}：{item.text}
        </div>
      ))}
    </section>
  )
}
