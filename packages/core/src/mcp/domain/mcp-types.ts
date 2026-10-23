/**
 * @design D-S-01
 * C-G（MCP 设置）能力的基础类型。
 *
 * 为什么把 Outcome 放在这里而不是各用例里：C-G 的所有用例都遵守「返回结果对象、不抛业务错误」
 * ——pi-web 里 `mcp-config-helpers.ts` 每个函数都返回 `{ok, error}`，页面对错误做字段级降级；
 * 如果改成抛异常，调用方每处都要 try/catch，且「整体降级」与「按 key 回填」两种失败路径会混在一起。
 *
 * 依据：design/protocols.md 的 PR-01…PR-08；design/components.md §4 的 store 形状。
 */

export type McpScope = 'user' | 'project'

export interface McpServerRef {
  scope: McpScope
  name: string
}

export interface McpServerSummary extends McpServerRef {
  enabled: boolean
  transport: string
  sourcePath: string
}

export interface McpTestResult {
  ok: boolean
  tools?: string[]
  durationMs?: number
  error?: McpError
}

/** 错误码封闭枚举：未知码按 `internal` 处理，但保留原文便于上报 */
export interface McpError {
  code: string
  /** 服务端原文；分类文案由 `failureText` 负责，这里只做兜底 */
  message?: string
  /** 请求在超时窗口内没有答案（不是"服务端拒绝"，重试可能有用） */
  timedOut?: boolean
  /** 需要项目信任：调用方要弹信任对话框后重试 */
  trustRequired?: boolean
}

export interface Outcome<T> {
  ok: boolean
  value?: T
  error?: McpError
}

export function ok<T>(value: T): Outcome<T> {
  return { ok: true, value }
}

export function fail<T = never>(error: McpError): Outcome<T> {
  return { ok: false, error }
}

/** 账本键：`scope/name`。pi-web 用 `mcpServerKey`，两边必须一致，否则按 key 的去重与回填会错配 */
export function serverKey(ref: McpServerRef): string {
  return `${ref.scope}/${ref.name}`
}

/**
 * 「最后一次」守卫：并发请求只允许最新一次的结果落地。
 *
 * 为什么不用 AbortController：pi-web 的语义是「后到的旧响应直接丢」，而不是取消服务端工作
 * （`McpConfig.tsx:520` 附近用自增序号比对）。abort 会把服务端正在做的事一起掐掉。
 */
export interface LatestOnly {
  run<T>(task: (isCurrent: () => boolean) => Promise<T>): Promise<T | undefined>
}

export function createLatestOnly(): LatestOnly {
  let generation = 0
  return {
    async run(task) {
      const mine = ++generation
      const isCurrent = () => mine === generation
      const value = await task(isCurrent)
      return isCurrent() ? value : undefined
    },
  }
}
