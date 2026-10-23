/**
 * MCP adapters 的最小 HTTP 客户端（core 内自足）。
 *
 * 为什么 core 里再放一份而不 import web 的 `lib/api-client`：
 * 1. core 不允许反向依赖 web（依赖只能向内），adapters 搬进来后就不能再摸 web 的路径；
 * 2. 这一份只服务 MCP 端口，语义比 web 的通用 client 更窄：非 2xx 抛 `ApiError`，
 *    网络失败也抛 `ApiError(status=0)`，adapter 再用 `toMcpError` 映射成封闭错误码。
 */

export class ApiError extends Error {
  override readonly name = 'ApiError'
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message)
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(path, init)
  } catch (e) {
    throw new ApiError(`Network error: ${e instanceof Error ? e.message : String(e)}`, 0)
  }
  if (!response.ok) {
    let message = `HTTP ${response.status}`
    try {
      const body = (await response.json()) as { message?: string; code?: string }
      if (body.message) message = body.message
    } catch {
      // 错误体不是 JSON：保留状态码文案
    }
    throw new ApiError(message, response.status)
  }
  try {
    return (await response.json()) as T
  } catch (e) {
    throw new ApiError(`Invalid JSON: ${e instanceof Error ? e.message : String(e)}`, 0)
  }
}
