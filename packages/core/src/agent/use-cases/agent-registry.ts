/**
 * @design D-U-14 getRegistry / hasBusyRpcSessionForCwd
 * @design D-B-03 reduceAgentEvent 的注册表侧：谁来接收事件
 *
 * 为什么要有注册表：同一个浏览器里可能同时开着两个 cwd 的会话，
 * 事件是按 requestId 回来的，没有注册表就只能靠"猜这一个是哪个"。
 */
import { acceptEvent, initialSessionState, type SessionState } from '../domain/session-state'

export interface RegistryEntry {
  key: string
  cwd: string | null
  state: SessionState
}

export function createAgentRegistry(): {
  get: (key: string) => RegistryEntry | null
  ensure: (key: string, cwd: string | null) => RegistryEntry
  applyEvent: (key: string, requestId: number) => boolean
  hasBusyForCwd: (cwd: string) => boolean
  keys: () => string[]
} {
  const entries = new Map<string, RegistryEntry>()
  return {
    get: (key) => entries.get(key) ?? null,
    ensure: (key, cwd) => {
      const existing = entries.get(key)
      if (existing) return existing
      const created: RegistryEntry = { key, cwd, state: initialSessionState() }
      entries.set(key, created)
      return created
    },
    // 返回"这条事件该不该应用"：旧 requestId 的回包在这里被挡掉
    applyEvent: (key, requestId) => {
      const entry = entries.get(key)
      if (!entry) return false
      const accepted = acceptEvent(entry.state, requestId)
      if (accepted) entry.state = { ...entry.state, lastRequestId: requestId }
      return accepted
    },
    // 一个 cwd 下只要还有会话在跑，就不该再开新会话（pi-web 的 busy 判定同理）
    hasBusyForCwd: (cwd) =>
      [...entries.values()].some(
        (e) => e.cwd === cwd && (e.state.phase === 'running' || e.state.phase === 'starting'),
      ),
    keys: () => [...entries.keys()],
  }
}
