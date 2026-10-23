/**
 * api-client — typed fetch wrapper for Next.js Route Handlers (per PR.B).
 *
 * 为什么单独抽出 wrapper：
 * - 后续所有 PR.B+ 调用方都共享 ApiError 类型（per spec §9.2 错误传播）
 * - 让测试只 mock fetch()，不必每个 hook 各自处理 error mapping
 *
 * 设计决策（per plan §1B.1 + spec §9.2）：
 * - 任何非 2xx 抛 ApiError（带 status + message）
 * - 任何 network / JSON-parse 失败也抛 ApiError（status=0 表示"没到 HTTP 层"）
 * - 透传 init options（method/headers/body）给 fetch
 *
 * 不做的事（PR.B scope）：
 * - 不做 retry / backoff（PR.D 才加 per Phase 0 lesson）
 * - 不做 zod 校验（api-types.ts 在 PR.B.2 才引入）
 * - 不抽 SSR vs CSR 区分（Phase 2+ 才考虑）
 *
 * 参数顺序：plan §1B.1 写的是 `(status, message)`；为符合 Error 通用约定
 * 改成 `(message, status)`。已在 ledger 标注。
 */

/**
 * ApiError — HTTP / network failure surfaced to caller.
 *
 * `status`:
 * - 4xx/5xx: actual HTTP status from response
 * - 0: network failure (fetch rejected) or JSON parse error (no HTTP layer reached)
 */
export class ApiError extends Error {
  override readonly name = 'ApiError'
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message)
    // 保留 prototype chain（TS extends Error 时必需）
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

/**
 * fetchApi — typed JSON fetch wrapper.
 *
 * @param path  URL path (relative to current origin)
 * @param init  Standard RequestInit options
 * @returns     Parsed JSON body typed as T
 * @throws      ApiError on non-2xx, network failure, or invalid JSON
 */
export async function fetchApi<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(path, init)
  } catch (e) {
    // Network failure (offline, DNS, CORS, etc.) — fetch never got HTTP response.
    const message = e instanceof Error ? e.message : String(e)
    throw new ApiError(`Network error: ${message}`, 0)
  }

  if (!response.ok) {
    // Try to surface server's error message if it sent one
    let bodyMessage = `HTTP ${response.status}`
    try {
      const body = (await response.json()) as { error?: string; message?: string }
      bodyMessage = body.error ?? body.message ?? bodyMessage
    } catch {
      // body wasn't parseable; fall back to status-only message
    }
    throw new ApiError(bodyMessage, response.status)
  }

  try {
    return (await response.json()) as T
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    throw new ApiError(`Invalid JSON response: ${message}`, 0)
  }
}
