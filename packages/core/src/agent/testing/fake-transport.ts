/**
 * 假传输（桩）：给 C-A 的 11 个 HTTP 表面点提供"契约实现"，而不是 HTTP mock。
 *
 * 为什么不是 mock：`useAgentSession.ts` 的调用方只认 `AgentTransport` 三件事
 * （发命令、订阅事件、取消订阅）。一个按契约产生事件的假传输，能让消费方
 * **真跑**（渲染、排队、竞态都在），而 mock 只能让断言通过。
 *
 * 事件序列与 `ref_projects/pi-web/lib/rpc-manager.ts` 的真实回包同形：
 * `message_start` → `text_delta`(多次) → `message_end`，外加 `requestId` 递增。
 * 事件名以冻结契约为准（`contracts/wire.md` 的 `text_delta`）——之前这里写成
 * `message_delta`，导致「假传输能跑、真链路 UI 收不到增量」这种只在联调时才暴露的错。
 */
import type {
  AgentTransport,
  TransportEvent,
  TransportOutcome,
  TransportPrompt,
} from '../domain/ports/agent-transport'

export interface FakeTransportOptions {
  /** 每段正文；默认两段就够（一段看不出流式） */
  chunks?: string[]
  /** 发完事件后的延迟（毫秒）；0 表示同步发，便于单测 */
  delayMs?: number
  /** 置 true 让 prompt 直接失败，用于测降级 */
  failPrompt?: boolean
}

export function createFakeTransport(options: FakeTransportOptions = {}): AgentTransport & {
  /** 已发出的命令，便于断言"排队的消息没发出去" */
  readonly sent: { command: string; payload: unknown }[]
  /** 手动推进事件（delayMs=0 时也会立即推） */
  drain: () => void
} {
  const handlers = new Set<(event: TransportEvent) => void>()
  const chunks = options.chunks ?? ['收到：', '这是假传输的回复。']
  const sent: { command: string; payload: unknown }[] = []
  let requestId = 0
  const queue: TransportEvent[] = []
  const emit = (event: TransportEvent) => {
    for (const h of handlers) h(event)
  }
  const push = (event: TransportEvent) => {
    if (!options.delayMs) {
      emit(event)
      return
    }
    queue.push(event)
  }
  return {
    sent,
    subscribe(handler) {
      handlers.add(handler)
      return () => handlers.delete(handler)
    },
    async send(command, payload): Promise<TransportOutcome> {
      sent.push({ command, payload })
      if (command === 'abort') {
        emit({ requestId, type: 'aborted', payload: {} })
        return { ok: true }
      }
      if (command === 'compact') {
        // 有延迟时把压缩事件也排进队列：否则 compaction 的两个事件在同一 tick 到达，
        // "压缩中"这段窗口宽度为 0，界面与 e2e 都观察不到（B-014 要靠它断言）。
        if ((options.delayMs ?? 0) > 0) {
          push({ requestId, type: 'compaction_start', payload: {} })
          push({ requestId, type: 'compaction_end', payload: {} })
        } else {
          emit({ requestId, type: 'compaction_start', payload: {} })
          emit({ requestId, type: 'compaction_end', payload: {} })
        }
        return { ok: true }
      }
      if (options.failPrompt)
        return { ok: false, error: { code: 'transport-down', message: '假传输：故意失败' } }
      requestId += 1
      const id = requestId
      push({ requestId: id, type: 'message_start', payload: {} })
      // 增量就是增量：曾经这里给第一块拼上了用户的 prompt 文本（`text`），
      // 在只有 `message_start` 能穿过 HTTP 的那段时间看起来正常；`acceptEvent` 修好后
      // 全部增量都到浏览器，界面就变成"一致性检查一致性检查"——e2e `s-045` 抓到的就是这个。
      for (const chunk of chunks)
        push({ requestId: id, type: 'text_delta', payload: { text: chunk } })
      push({ requestId: id, type: 'message_end', payload: {} })
      return { ok: true, value: { requestId: id } }
    },
    // 一次只放一个事件：`splice(0)` 全放会让「运行中」窗口只有一次 tick，
    // 界面来不及渲染排队态（e2e 的运行态用例全部超时，就是这个原因）。
    drain() {
      const next = queue.shift()
      if (next) emit(next)
    },
  }
}
