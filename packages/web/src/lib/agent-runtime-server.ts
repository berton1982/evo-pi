import 'server-only'

/**
 * 进程内的 agent 运行时（H2 的一部分）。
 *
 * 为什么需要它：C-A 的 `AgentTransport` 端口一直只有"假实现"（`packages/core/src/agent/testing/fake-transport.ts`），
 * 导致 44 条 e2e 全是 `test.fixme`——**没有传输通道，就验不了"命令经后端再流回来"**。
 * 这个模块把端口挂到 HTTP/SSE 上，让前端与测试都能真跑；换真后端时只替换 `transport` 的构造。
 *
 * 边界：
 * - 进程内单例（`globalThis` 上挂），因为 Next 的 route 模块可能被多次加载；
 * - 每个会话一个 runtime，事件只推给订阅者；
 * - **不落盘**：会话历史仍由 `/api/sessions/[id]` 负责，这里只管"这一轮怎么跑"。
 */
import {
  type AgentTransport,
  acceptEvent,
  admitPrompt,
  createFakeTransport,
  initialSessionState,
  reduceAgentEvent,
  type SessionState,
  type StreamMode,
  type TransportEvent,
} from '@evo-pi/core/agent'

export interface AgentRuntimeEvent {
  type: 'state' | 'transport'
  state: SessionState
  event?: TransportEvent
}

interface SessionRuntime {
  state: SessionState
  transport: AgentTransport
  subscribers: Set<(e: AgentRuntimeEvent) => void>
  /** 已处理到哪个 requestId：事件乱序时用它挡掉旧响应（对应 B-003） */
  lastApplied: number
}

interface RuntimeRegistry {
  sessions: Map<string, SessionRuntime>
}

const KEY = Symbol.for('evo-pi.agent-runtime')

function registry(): RuntimeRegistry {
  const g = globalThis as unknown as Record<symbol, RuntimeRegistry | undefined>
  g[KEY] ??= { sessions: new Map() }
  return g[KEY]
}

function runtimeFor(sessionId: string): SessionRuntime {
  const reg = registry()
  const existing = reg.sessions.get(sessionId)
  if (existing) return existing

  // 假传输按契约产生 `message_start → message_delta×n → message_end`。
  // 换真后端时这里替换成真实 transport，其余代码不用动（这就是端口的意义）。
  // `AGENT_FAKE_DELAY_MS` 让增量分批到达：默认 0（同步跑完），e2e 要观察
  // 「运行中」这一段时设成 30~50ms，配合下面的 drain 定时器。
  const delayMs = Number(process.env.AGENT_FAKE_DELAY_MS ?? 0)
  const transport = createFakeTransport({
    chunks: ['收到：', '一致性检查。', '这是假传输的回复。'],
    delayMs,
  })
  if (delayMs > 0) {
    // 假传输把事件排进队列，必须有人按节奏 flush——真传输是 SSE 自己推，
    // 这里没有网络在推，所以由运行时代劳。
    const timer = setInterval(() => transport.drain(), delayMs)
    timer.unref?.()
  }
  const runtime: SessionRuntime = {
    state: initialSessionState(),
    transport,
    subscribers: new Set(),
    lastApplied: 0,
  }
  transport.subscribe((event: TransportEvent) => {
    const applied = acceptEvent(runtime.state, event.requestId)
    if (!applied) return // 旧响应：不落库也不广播（B-003）
    const next = reduceAgentEvent(runtime.state, event)
    runtime.state = next.state
    runtime.lastApplied = Math.max(runtime.lastApplied, event.requestId)
    emit(runtime, { type: 'transport', state: runtime.state, event })
  })
  reg.sessions.set(sessionId, runtime)
  return runtime
}

function emit(runtime: SessionRuntime, payload: AgentRuntimeEvent): void {
  for (const fn of runtime.subscribers) {
    try {
      fn(payload)
    } catch {
      // 单个订阅者出错不影响其他人（SSE 连接断开是常态）
    }
  }
}

export function subscribeAgent(sessionId: string, fn: (e: AgentRuntimeEvent) => void): () => void {
  const runtime = runtimeFor(sessionId)
  runtime.subscribers.add(fn)
  fn({ type: 'state', state: runtime.state })
  return () => runtime.subscribers.delete(fn)
}

export function agentSnapshot(sessionId: string): SessionState {
  return runtimeFor(sessionId).state
}

export async function dispatchAgent(
  sessionId: string,
  input: {
    command: 'prompt' | 'abort' | 'compact'
    text?: string
    mode?: StreamMode
    clientRequestId?: string
  },
): Promise<{ ok: boolean; error?: { code: string; message?: string } }> {
  const runtime = runtimeFor(sessionId)
  if (input.command === 'prompt') {
    const decision = await admitPrompt({
      state: runtime.state,
      transport: runtime.transport,
      sessionId,
      text: input.text ?? '',
      ...(input.mode ? { mode: input.mode } : {}),
      ...(input.clientRequestId ? { clientRequestId: input.clientRequestId } : {}),
    })
    if (decision.kind === 'queued') {
      // 运行中只排队、不发请求（B-002）；界面据此显示「引导/追加」。
      runtime.state = decision.state
      emit(runtime, { type: 'state', state: runtime.state })
      return { ok: true }
    }
    return decision.outcome.ok ? { ok: true } : { ok: false, error: decision.outcome.error }
  }
  const res = await runtime.transport.send(input.command, { sessionId })
  emit(runtime, { type: 'state', state: runtime.state })
  return res.ok ? { ok: true } : { ok: false, error: res.error }
}
