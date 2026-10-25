/**
 * @design D-U-01 SessionData 形状与"新会话"判定
 *
 * 为什么把形状写在一处：`useAgentSession.ts:1-349` 里 55 个声明几乎都在描述同一件事——
 * "这个 session 现在是什么样"。形状散开的后果是每处各写一遍 `?.` 兜底，
 * 于是没人知道"空"到底意味着"还没加载"还是"确实没有"。
 */
export type SessionPhase = 'idle' | 'starting' | 'running' | 'compacting'

export interface SessionData {
  sessionId: string | null
  cwd: string | null
  phase: SessionPhase
  /** 还没落盘的新会话：pi SDK 在第一条消息之前不写 .jsonl */
  isNew: boolean
  model: string | null
  thinkingLevel: string | null
}

export function emptySessionData(cwd: string | null = null): SessionData {
  return { sessionId: null, cwd, phase: 'idle', isNew: false, model: null, thinkingLevel: null }
}

/**
 * 归一化外部数据：缺字段一律落到"明确的空"，而不是 undefined。
 * quiet=true 时连 phase 都不猜（未知值 → idle），避免把脏数据当运行中。
 */
export function normalizeSessionData(raw: unknown): SessionData {
  const rec = (raw ?? {}) as Partial<Record<keyof SessionData, unknown>>
  const phase = rec.phase
  return {
    sessionId: typeof rec.sessionId === 'string' ? rec.sessionId : null,
    cwd: typeof rec.cwd === 'string' ? rec.cwd : null,
    phase:
      phase === 'starting' || phase === 'running' || phase === 'compacting' || phase === 'idle'
        ? phase
        : 'idle',
    isNew: rec.isNew === true,
    model: typeof rec.model === 'string' ? rec.model : null,
    thinkingLevel: typeof rec.thinkingLevel === 'string' ? rec.thinkingLevel : null,
  }
}

/** 有 id 但还没落盘 → 新会话；没有任何 id → 不存在会话（两者不能混为一谈）。 */
export function isNewSession(data: SessionData): boolean {
  return data.sessionId !== null && data.isNew
}
