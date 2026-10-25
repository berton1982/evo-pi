'use client'

/**
 * @design D-U-06
 * 输入工具条。主行只留 **附件** 与 **发送**；运行中发送位换成 **引导 ▲** 与 **追加 ▼**；
 * 其余控件（模型 / 推理级别 / 工具预设 / 压缩 / 声音 / 输入历史 / 停止 agent）
 * 全部收进「更多控件」折叠面板 —— 依据 `ChatInput.tsx:2415/2365/2316/2357/2471/2826`。
 *
 * 停止放在折叠面板里是 pi-web 的选择：主行只表达"发什么"，不表达"管什么"。
 */
import { useState } from 'react'

export type SendMode = 'send' | 'steer' | 'followUp'

export function ComposerToolbar({
  running,
  canSend,
  onSend,
  onStop,
  onCompact,
  onAttach,
  compacting,
  soundOn,
  onToggleSound,
}: {
  running: boolean
  canSend: boolean
  onSend: (mode: SendMode) => void
  onStop?: () => void
  onCompact?: () => void
  onAttach?: () => void
  compacting?: boolean
  /** 完成提示音开关（B-015）；开关状态由装配点持久化 */
  soundOn?: boolean
  onToggleSound?: () => void
}): React.JSX.Element {
  const [moreOpen, setMoreOpen] = useState(false)
  return (
    <div data-testid="chat-composer-toolbar" className="flex flex-col gap-1 border-border border-t">
      <div className="flex items-center gap-1 px-2 py-1">
        <button
          type="button"
          data-testid="chat-attach"
          onClick={onAttach}
          disabled={!onAttach}
          title="附件"
        >
          附件
        </button>
        {running ? (
          <>
            <button
              type="button"
              data-testid="chat-steer"
              onClick={() => onSend('steer')}
              disabled={!canSend}
            >
              ▲ 引导
            </button>
            <button
              type="button"
              data-testid="chat-follow-up"
              onClick={() => onSend('followUp')}
              disabled={!canSend}
            >
              ▼ 追加
            </button>
          </>
        ) : (
          <button
            type="button"
            data-testid="chat-send"
            onClick={() => onSend('send')}
            disabled={!canSend}
          >
            发送
          </button>
        )}
        <button
          type="button"
          data-testid="chat-more"
          aria-expanded={moreOpen}
          className="ml-auto"
          onClick={() => setMoreOpen((v) => !v)}
        >
          更多控件 {moreOpen ? '▾' : '▸'}
        </button>
      </div>
      {moreOpen ? (
        <div
          data-testid="chat-more-panel"
          className="flex flex-wrap items-center gap-2 px-2 pb-1 text-xs"
        >
          <button type="button" disabled title="模型选择属 C-B">
            模型
          </button>
          <button type="button" disabled title="推理级别属 C-B">
            推理级别
          </button>
          <button type="button" disabled title="工具预设属 C-B">
            工具预设
          </button>
          <button
            type="button"
            data-testid="chat-sound"
            aria-pressed={Boolean(soundOn)}
            onClick={onToggleSound}
            disabled={!onToggleSound}
            title="完成提示音（中断时不响）"
          >
            提示音 {soundOn ? '开' : '关'}
          </button>
          <button
            type="button"
            data-testid="chat-compact"
            onClick={onCompact}
            disabled={!onCompact || compacting}
          >
            {compacting ? '停止压缩' : '压缩上下文'}
          </button>
          <button
            type="button"
            data-testid="chat-stop"
            onClick={onStop}
            disabled={!onStop || !running}
          >
            停止 agent
          </button>
        </div>
      ) : null}
    </div>
  )
}
