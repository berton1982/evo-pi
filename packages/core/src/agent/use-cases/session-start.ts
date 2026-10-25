/**
 * @design D-U-15 targetCwd / finishStartingSession
 * @design D-B-04 readSession：single-flight 读会话
 *
 * single-flight 的意义：同一个会话被两个组件同时要（列表 + 详情），
 * 不做合并就是两次磁盘读，且后到的结果会覆盖先到的（闪一下旧内容）。
 */
export interface SessionReadRequest {
  sessionId: string
  tail?: number
}

export function createSessionReader<T>(deps: { read: (req: SessionReadRequest) => Promise<T> }): {
  read: (req: SessionReadRequest) => Promise<T>
} {
  const inflight = new Map<string, Promise<T>>()
  return {
    read: (req) => {
      const key = `${req.sessionId}` // tail 不影响"读哪一条会话"，同一会话合并成一次
      const existing = inflight.get(key)
      if (existing) return existing
      const p = deps.read(req).finally(() => {
        inflight.delete(key)
      })
      inflight.set(key, p)
      return p
    },
  }
}

/** cwd 的归一：空/相对路径一律拒绝，避免"在当前进程目录里瞎读"。 */
export function targetCwd(input: string | null | undefined): string | null {
  if (!input) return null
  const trimmed = input.trim()
  if (!trimmed) return null
  return trimmed.startsWith('/') ? trimmed : null
}

export function finishStartingSession<T extends { phase: string }>(data: T): T {
  return data.phase === 'starting' ? { ...data, phase: 'running' } : data
}
