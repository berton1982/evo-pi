/**
 * @design P-S-01
 *
 * HTTP 失败 → `McpError` 的统一映射。
 *
 * 为什么单独一个文件：四个适配器都要把 `fetchApi` 抛的 `ApiError` 翻成端口契约里的 `Outcome`，
 * 各写一遍必然出现"某处抛、某处吞"的差异（pi-web 就是三种写法并存）。
 * 规矩：**适配器永远不抛**，所有失败都变成 `{ok:false, error}`。
 */

import type { McpError } from '../domain/mcp-types'
import { ApiError, fetchJson } from './http-client'

export function toMcpError(e: unknown): McpError {
  if (e instanceof ApiError) {
    const message = e.message
    if (e.status === 0) {
      // 没到 HTTP 层：离线 / DNS / JSON 解析失败。可重试，但不是"服务端拒绝"。
      return { code: 'network', message, timedOut: /timeout|aborted/i.test(message) }
    }
    switch (e.status) {
      case 401:
      case 403:
        return {
          code: /trust/i.test(message) ? 'untrusted' : 'forbidden',
          message,
          trustRequired: /trust/i.test(message),
        }
      case 404:
        return { code: 'not-found', message }
      case 409:
        return { code: 'conflict', message }
      case 400:
        return { code: /name/i.test(message) ? 'invalid-name' : 'bad-request', message }
      default:
        return { code: 'internal', message }
    }
  }
  const message = e instanceof Error ? e.message : String(e)
  return { code: 'internal', message }
}

/**
 * 统一的 JSON 请求入口。
 *
 * 为什么不让适配器各自 `fetch(...).then(r => r.json())`：注入的假 fetch 在测试里返回 `Response`，
 * 而真 `fetchApi` 返回已解析的 body——两套形状混在一个函数里就会出现"测试绿、线上 undefined"
 * （本轮实测：`list` 拿到 `Response` 却当 body 读 `servers`，于是列表永远空）。
 */
export async function requestJson<T>(
  deps: { fetchImpl?: typeof fetch },
  path: string,
  init?: RequestInit,
): Promise<T> {
  if (!deps.fetchImpl) return fetchJson<T>(path, init)
  const res = (await deps.fetchImpl(path, init)) as Response
  if (res && typeof res.json === 'function') {
    if (!res.ok) {
      let message = `HTTP ${res.status}`
      try {
        const body = (await res.json()) as { error?: string; message?: string }
        message = body.error ?? body.message ?? message
      } catch {
        // body 不是 JSON：保留状态码文案
      }
      throw new ApiError(message, res.status)
    }
    return (await res.json()) as T
  }
  return res as unknown as T
}

/** 读服务端统一响应包装：`{ ok, ...payload }` 或缺省直接给对象 */
export function unwrap<T>(body: unknown): T {
  if (body && typeof body === 'object' && 'ok' in body) {
    const { ok: _ok, ...rest } = body as Record<string, unknown>
    return rest as T
  }
  return body as T
}
