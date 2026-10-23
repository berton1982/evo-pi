/**
 * @design P-S-02
 *
 * `McpTestRunner` 的 HTTP 实现。契约：`POST /api/mcp/test`。
 *
 * 超时语义：服务端可能 60s 才回；这里不设本地超时（由服务端决定），
 * 但把 `AbortError`/`timeout` 措辞映射成 `timedOut`，让 UI 提示"再试一次"而不是"配置错了"。
 */

import type { McpTestResult, Outcome } from '../domain/mcp-types'
import type { McpTestRunner } from '../domain/ports'
import { requestJson, toMcpError, unwrap } from './error-mapping'

export function createHttpMcpTestRunner(deps: { fetchImpl?: typeof fetch } = {}): McpTestRunner {
  return {
    async run(ref, cwd) {
      try {
        const init: RequestInit = {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ ...ref, cwd }),
        }
        const raw = await requestJson<unknown>(deps, '/api/mcp/test', init)
        const payload = unwrap<{
          ok?: boolean
          tools?: string[]
          durationMs?: number
          error?: string
        }>(raw)
        const result: McpTestResult =
          payload.ok === false || payload.error
            ? { ok: false, error: { code: 'internal', message: payload.error } }
            : { ok: true, tools: payload.tools ?? [], durationMs: payload.durationMs }
        return { ok: true, value: result }
      } catch (e) {
        // 端口层成功、业务层失败：把"测试没通过"也放进 value，而不是让 outcome 失败
        const error = toMcpError(e)
        return { ok: true, value: { ok: false, error } } as Outcome<McpTestResult>
      }
    },
  }
}
