'use client'

/**
 * @design D-U-10
 * 用户消息：气泡限高可展开 + 就地编辑。
 *
 * 时间戳不在这里渲染：`MessageItem` 统一渲染并做"相邻同分钟去重"（B-037），
 * 两处都画会出现两个时间。
 */
import { useState } from 'react'
import { MarkdownBody } from './markdown-body'

/** 超过这个高度先折叠（pi-web `MessageView.tsx:503` 同义：气泡不许把整屏吃掉） */
const MAX_BUBBLE_HEIGHT = 220
/** 短消息不折叠：给 3 行正文留台阶，否则每句话都挂一个"展开全文" */
const FOLD_MIN_CHARS = 240

export function UserMessage({
  text,
  onEdit,
}: {
  text: string
  /** 保存后的新正文；不传则只读（编辑入口也不出现） */
  onEdit?: (next: string) => void
}): React.JSX.Element {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(text)
  const foldable = text.length > FOLD_MIN_CHARS

  const save = () => {
    const next = draft.trim()
    if (next && next !== text) onEdit?.(next)
    setEditing(false)
  }

  return (
    <div className="flex flex-col items-end gap-1" data-testid="chat-user-message">
      <div
        className="max-w-[80%] rounded-lg bg-user-bg px-3 py-2 text-sm"
        data-testid="chat-user-bubble"
        style={
          foldable && !expanded && !editing
            ? { maxHeight: MAX_BUBBLE_HEIGHT, overflow: 'hidden' }
            : undefined
        }
      >
        {editing ? (
          <div className="space-y-2">
            <textarea
              data-testid="chat-user-edit-input"
              aria-label="编辑这条消息"
              className="w-full min-w-[280px] resize-y rounded border border-border bg-background p-1 text-sm"
              rows={4}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                data-testid="chat-user-edit-cancel"
                onClick={() => setEditing(false)}
              >
                取消
              </button>
              <button type="button" data-testid="chat-user-edit-save" onClick={save}>
                保存
              </button>
            </div>
          </div>
        ) : (
          <MarkdownBody text={text} />
        )}
      </div>
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        {foldable ? (
          <button
            type="button"
            data-testid="chat-user-expand"
            aria-expanded={expanded}
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? '收起' : '展开全文'}
          </button>
        ) : null}
        {onEdit ? (
          <button
            type="button"
            data-testid="chat-user-edit"
            onClick={() => {
              setDraft(text)
              setEditing(true)
            }}
          >
            编辑
          </button>
        ) : null}
      </div>
    </div>
  )
}
