/**
 * @design P-C-01
 * `AgentTransport` 的 HTTP 实现：`POST /api/agent/[id]` 发命令，`GET /api/agent/[id]` 收 SSE。
 *
 * 为什么用 EventSource 而不是 `fetch` 流：浏览器原生重连、解析 `data:` 帧都不用自己写；
 * 代价是只能 GET，所以命令走另一条 POST——正好对应端口上的两个方法。
 */
import type { AgentTransport, TransportCommand, TransportEvent } from '@evo-pi/core/agent'

interface ServerEvent {
  type: 'state' | 'transport'
  state: unknown
  event?: TransportEvent
}

export function createHttpAgentTransport(sessionId: string): AgentTransport {
  return {
    async send(command: TransportCommand, payload: unknown) {
      const body = { command, ...(payload as Record<string, unknown>) }
      try {
        const res = await fetch(`/api/agent/${encodeURIComponent(sessionId)}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const detail = (await res.json().catch(() => ({}))) as { error?: string }
          return { ok: false, error: { code: detail.error ?? `http-${res.status}` } }
        }
        const out = (await res.json()) as { state?: { lastRequestId?: number } }
        return { ok: true, value: { requestId: out.state?.lastRequestId } }
      } catch (err) {
        return { ok: false, error: { code: 'network', message: (err as Error).message } }
      }
    },
    subscribe(handler) {
      const source = new EventSource(`/api/agent/${encodeURIComponent(sessionId)}`)
      source.onmessage = (ev: MessageEvent<string>) => {
        try {
          const parsed = JSON.parse(ev.data) as ServerEvent
          // 只把传输事件交给订阅者：`state` 帧是"连上就能渲染"的初值，
          // 由调用方用 `send` 的返回值或后续事件驱动，避免同一状态被消费两次。
          if (parsed.type === 'transport' && parsed.event) handler(parsed.event)
        } catch {
          // 半包/心跳不是错误：SSE 的 `: ping` 注释帧不会进 onmessage
        }
      }
      return () => source.close()
    },
  }
}
