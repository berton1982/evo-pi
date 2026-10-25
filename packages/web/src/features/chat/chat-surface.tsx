'use client'

import type { AgentTransport } from '@evo-pi/core/chat'
import { createAbortTurn, createCompactContext, createSendTurn } from '@evo-pi/core/chat'
/**
 * @design D-S-01
 * @design D-U-07
 * 会话面容器：把「消息列表 + 输入工具条 + 排队区 + 会话信息」拼成一屏。
 *
 * 容器只做三件事：取数、把上行动作转成用例调用、把结果写回 store。
 * 判定（哪块算最终回答）、几何（什么时候滚到底）在 `domain/`；
 * 发送/中断/压缩的规则在 `@evo-pi/core/chat`——这里不重新实现一遍。
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createHttpAgentTransport } from './adapters/http-agent-transport'
import { ComposerQueue, type QueuedItem } from './composer-queue'
import { ComposerToolbar, type SendMode } from './composer-toolbar'
import { type AppUpdateInfo, shouldShowUpdate } from './domain/app-update-banner'
import { MessageList } from './message-list'
import { SessionInfoPanel } from './session-info-panel'
import { useChatMessages } from './stores/chat-messages'
import { ChatSessionProvider } from './thinking-context'
import { useSessionMessages } from './use-session-messages'

export interface ChatSurfaceProps {
  /** 会话 id：为空表示还没有会话（不发起发送） */
  sessionId: string | null
  cwd: string | null
  /** 传输端口由装配点注入：容器不 import 任何 adapters */
  transport?: AgentTransport
  running?: boolean
  compacting?: boolean
  update?: AppUpdateInfo | null
  currentVersion?: string
  /** 打开文件（工具块里的路径点击）：装配点注入，能力内部不拼 URL */
  onOpenFile?: (input: { cwd: string; path: string; line?: number }) => void
}

export function ChatSurface({
  sessionId,
  cwd,
  transport,
  running = false,
  compacting = false,
  update = null,
  currentVersion = '',
  onOpenFile: _onOpenFile, // 文件跳转属于 C-B 的壳：这里先接住，避免装配点改签名
}: ChatSurfaceProps): React.JSX.Element {
  // 注意：不要 `useChatMessages(selectMessages)`——选择器每次返回**新数组**，
  // zustand 按引用比较 → 触发无限重渲染（实测 React error #185）。
  // 只订阅两个稳定引用，再在组件里 useMemo 派生。
  const order = useChatMessages((state) => state.order)
  const byId = useChatMessages((state) => state.byId)
  const messages = useMemo(
    () =>
      order
        .map((id) => byId[id])
        .filter((message): message is NonNullable<typeof message> => Boolean(message)),
    [byId, order],
  )
  const upsert = useChatMessages((state) => state.upsert)
  const appendText = useChatMessages((state) => state.appendText)
  // 传输端口：装配点注入优先；否则走 `/api/agent` 的 SSE（H2 的真实通道）；
  // 只有 e2e 构建显式打开 `NEXT_PUBLIC_E2E_FAKE_TRANSPORT` 时才用 in-page 假传输
  // （离线跑组件测试、或后端没起时用——它不经过网络，验不到"命令往返"这件事）。
  const wiredTransport = useMemo(() => {
    if (transport) return transport
    // 只有注入与 HTTP 两条路。in-page 假传输（`NEXT_PUBLIC_E2E_FAKE_TRANSPORT`）已移除：
    // 它不经过网络，会让"发送后拿到的是桩回复"看起来像接通（用户实际误会过一次）。
    return sessionId ? createHttpAgentTransport(sessionId) : null
  }, [transport, sessionId])
  // 传输来源必须可观测：此前"发送没反应"只能靠读代码推断走的是哪条路
  // （注入 / in-page 假传输 / HTTP SSE），e2e 也因此写出过"以为在测 HTTP"的用例。
  const transportKind = transport ? 'injected' : sessionId ? 'http' : 'none'
  // 后端连的到底是桩还是真 agent：只有后端知道，必须问它并如实显示
  const [backendTransport, setBackendTransport] = useState<{ kind: string; hint: string } | null>(
    null,
  )
  useEffect(() => {
    if (!sessionId) return
    let cancelled = false
    void fetch(`/api/agent/${encodeURIComponent(sessionId)}?snapshot=1`)
      .then((res) => (res.ok ? res.json() : null))
      .then((body: { transport?: { kind: string; hint: string } } | null) => {
        if (!cancelled) setBackendTransport(body?.transport ?? null)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [sessionId])
  const [streamingRun, setStreamingRun] = useState(false)
  const isRunning = running || streamingRun
  if (process.env.NEXT_PUBLIC_E2E_DEBUG === '1')
    console.log('[chat-surface] render isRunning=', isRunning, 'streamingRun=', streamingRun)
  const [text, setText] = useState('')
  const [queued, setQueued] = useState<QueuedItem[]>([])
  const [infoOpen, setInfoOpen] = useState(false)
  /** 附件（B-053）：只记名字与大小；真正上传要写盘，本轮随消息一起提交的是引用 */
  const [attachments, setAttachments] = useState<string[]>([])
  /** 完成提示音（B-015）：开关持久化，中断时不响 */
  const [soundOn, setSoundOn] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem('evo-pi:chat-sound') === 'on'
  })
  // 真实数据源：会话面自己装上下文，装配点不再代劳
  const { loading, error, reload } = useSessionMessages(sessionId)

  const useCases = useMemo(
    () => ({
      send: wiredTransport ? createSendTurn({ transport: wiredTransport }) : null,
      abort: wiredTransport ? createAbortTurn({ transport: wiredTransport }) : null,
      compact: wiredTransport ? createCompactContext({ transport: wiredTransport }) : null,
    }),
    [wiredTransport],
  )

  const submit = useCallback(
    async (mode: SendMode) => {
      const value = text.trim()
      if (!value || !sessionId || !useCases.send) return
      // 运行中的提交一律进队列（默认 steer）：UI 只表达"排队"，投递时机由用例决定
      if (isRunning) {
        setQueued((prev) => [
          ...prev,
          {
            id: `q-${Date.now()}-${prev.length}`,
            text: value,
            mode: mode === 'followUp' ? 'followUp' : 'steer',
          },
        ])
        setText('')
        return
      }
      setText('')
      const result = await useCases.send.send({
        sessionId,
        clientRequestId: `req-${Date.now()}`,
        text: value,
        isRunning,
        mode: mode === 'send' ? undefined : mode,
      })
      // 失败不吞：把错误作为 assistant 消息写回，用户能看见原因
      if (!result.ok)
        upsert({
          id: `err-${Date.now()}`,
          role: 'assistant',
          blocks: [{ type: 'text', text: result.error.message ?? result.error.code }],
          streaming: false,
        })
    },
    [isRunning, sessionId, text, upsert, useCases],
  )

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_E2E_DEBUG === '1')
      console.log('[chat-surface] effect 订阅', Boolean(wiredTransport))
    if (!wiredTransport) return
    const liveId = 'live-assistant'
    const unsub = wiredTransport.subscribe((event) => {
      if (process.env.NEXT_PUBLIC_E2E_DEBUG === '1') console.log('[chat-surface] event', event.type)
      if (event.type === 'message_start') {
        setStreamingRun(true)
        upsert({ id: liveId, role: 'assistant', blocks: [], streaming: true })
        return
      }
      if (event.type === 'text_delta') {
        const delta = String((event.payload as { text?: string } | undefined)?.text ?? '')
        // 首块可能是第一条消息：store 里没有就先建，避免"有增量没消息"
        if (useChatMessages.getState().byId[liveId]) appendText(liveId, delta)
        else
          upsert({
            id: liveId,
            role: 'assistant',
            blocks: [{ type: 'text', text: delta }],
            streaming: true,
          })
        return
      }
      if (event.type === 'message_end') {
        setStreamingRun(false)
        const current = useChatMessages.getState().byId[liveId]
        // 没有正文就什么都不做：不能把 undefined 塞回 store（类型也不允许）
        if (current) upsert({ ...current, streaming: false })
        return
      }
      if (event.type === 'aborted' || event.type === 'compaction_end') setStreamingRun(false)
    })
    return () => {
      if (process.env.NEXT_PUBLIC_E2E_DEBUG === '1') console.log('[chat-surface] effect 退订')
      unsub()
    }
  }, [wiredTransport, upsert, appendText])

  const showUpdate = shouldShowUpdate(update, currentVersion)

  return (
    <ChatSessionProvider value={sessionId}>
      <section
        data-testid="chat-surface"
        data-component="chat-surface"
        data-transport={transportKind}
        className="flex h-full min-h-0 flex-col overflow-hidden"
      >
        {showUpdate ? (
          <div
            data-testid="chat-update-banner"
            role="status"
            className="border-b border-border bg-card px-4 py-2 text-sm"
          >
            有新版本 {update?.version} 可用
          </div>
        ) : null}

        <header className="flex items-center justify-between border-b border-border px-4 py-2">
          <span data-testid="chat-title" className="truncate font-semibold">
            {sessionId ? `会话 ${sessionId.slice(0, 8)}` : '未选择会话'}
          </span>
          <button
            type="button"
            data-testid="chat-session-info"
            aria-label="会话信息"
            aria-expanded={infoOpen}
            onClick={() => {
              setInfoOpen((open) => !open)
            }}
            className="rounded px-2 py-1 text-sm hover:bg-muted"
          >
            会话信息
          </button>
        </header>

        {infoOpen ? (
          <SessionInfoPanel
            info={{
              title: sessionId ? `会话 ${sessionId.slice(0, 8)}` : '未选择会话',
              entryCount: messages.length,
              cwd,
            }}
            onClose={() => {
              setInfoOpen(false)
            }}
          />
        ) : null}

        {loading ? (
          <p data-testid="chat-loading" className="px-4 py-2 text-sm text-muted-foreground">
            正在读取会话…
          </p>
        ) : null}
        {error ? (
          <p
            data-testid="chat-load-error"
            role="alert"
            className="px-4 py-2 text-sm text-destructive"
          >
            读取失败：{error}
            <button
              type="button"
              data-testid="chat-reload"
              onClick={reload}
              className="ml-2 underline"
            >
              重试
            </button>
          </p>
        ) : null}

        <MessageList
          messages={messages}
          empty="还没有消息。输入一句话开始。"
          onEditMessage={(messageId, next) => {
            // 只改本地视图：把消息持久化回会话文件要走 C-A 的运行时（CHG-004 已登记）
            const target = messages.find((message) => message.id === messageId)
            if (!target) return
            upsert({
              ...target,
              blocks: [{ type: 'text', text: next }],
            })
          }}
          onRetry={(messageId) => {
            const target = messages.find((message) => message.id === messageId)
            if (target)
              setText(
                target.blocks.map((block) => (block.type === 'text' ? block.text : '')).join('\n'),
              )
          }}
        />

        <ComposerQueue
          items={queued}
          onRecall={() => {
            setText(queued.map((item) => item.text).join('\n'))
            setQueued([])
          }}
        />

        {/* 输入框由容器持有：工具条只表达"发什么"，不持有草稿——
          草稿在召回排队消息、点重试回填时都要能被改写（`ChatWindow.tsx:953` 同义） */}
        <textarea
          data-testid="chat-input"
          aria-label="消息输入"
          value={text}
          rows={3}
          placeholder={
            isRunning
              ? '正在推理，输入的消息会排队（引导 / 追加）'
              : '输入消息，Enter 发送，Shift+Enter 换行'
          }
          onChange={(event) => {
            setText(event.target.value)
          }}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' || event.shiftKey) return
            event.preventDefault()
            // 运行中 Alt+Enter 是"排队"（pi-web `ChatInput.tsx:2340` aria-keyshortcuts）
            void submit(isRunning && !event.altKey ? 'send' : 'steer')
          }}
          className="mx-2 my-1 resize-none rounded border border-border bg-transparent px-2 py-1 text-sm"
        />

        {attachments.length > 0 ? (
          <ul data-testid="chat-attachments" className="mx-2 flex flex-wrap gap-1 text-xs">
            {attachments.map((name) => (
              <li
                key={name}
                data-testid="chat-attachment"
                className="rounded border border-border px-1"
              >
                {name}
                <button
                  type="button"
                  data-testid="chat-attachment-remove"
                  aria-label={`移除附件 ${name}`}
                  onClick={() => setAttachments((list) => list.filter((item) => item !== name))}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <input
          data-testid="chat-attach-input"
          aria-label="添加附件"
          type="file"
          multiple
          className="hidden"
          onChange={(event) => {
            const names = Array.from(event.target.files ?? []).map((file) => file.name)
            if (names.length > 0) setAttachments((list) => [...new Set([...list, ...names])])
            event.target.value = ''
          }}
        />

        {backendTransport?.kind === 'fake' ? (
        <p
          data-testid="chat-transport-badge"
          className="mx-auto mb-1 w-full max-w-[820px] px-4 text-[11px] text-muted-foreground"
        >
          演示模式：{backendTransport.hint}
        </p>
      ) : null}
      <ComposerToolbar
          running={isRunning}
          soundOn={soundOn}
          onToggleSound={() => {
            const next = !soundOn
            setSoundOn(next)
            window.localStorage.setItem('evo-pi:chat-sound', next ? 'on' : 'off')
          }}
          onAttach={() => {
            // 用隐藏 input 触发系统文件选择：主行只留一个「附件」按钮（对齐 `ChatInput.tsx:2415`）
            const input = document.querySelector<HTMLInputElement>(
              '[data-testid="chat-attach-input"]',
            )
            input?.click()
          }}
          compacting={compacting}
          canSend={Boolean(text.trim() && sessionId && useCases.send)}
          onSend={async (mode) => {
            await submit(mode)
          }}
          onStop={() => {
            if (sessionId) void useCases.abort?.abort(sessionId, isRunning)
          }}
          onCompact={() => {
            if (sessionId) void useCases.compact?.compact(sessionId, compacting)
          }}
        />
      </section>
    </ChatSessionProvider>
  )
}
