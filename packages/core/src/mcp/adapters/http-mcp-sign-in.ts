/**
 * @design P-S-03
 *
 * `McpSignInFlowPort` 的 HTTP 实现。
 * 契约：`POST /api/mcp/sign-in`、`GET/POST/DELETE /api/mcp/sign-in/[flowId]`。
 *
 * `submit` 只发用户粘贴回来的 redirect URL，不猜流程状态——状态由服务端轮询回答。
 */

import type { Outcome } from '../domain/mcp-types'
import type { McpSignInFlowPort } from '../domain/ports'
import { requestJson, toMcpError, unwrap } from './error-mapping'

export function createHttpMcpSignIn(deps: { fetchImpl?: typeof fetch } = {}): McpSignInFlowPort {
  return {
    async begin(ref, cwd) {
      try {
        const body = await requestJson<unknown>(deps, '/api/mcp/sign-in', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ ...ref, cwd }),
        })
        const payload = unwrap<{ flowId: string; url?: string }>(body)
        return { ok: true, value: payload }
      } catch (e) {
        return { ok: false, error: toMcpError(e) } as Outcome<never>
      }
    },
    async status(flowId) {
      try {
        const body = await requestJson<unknown>(
          deps,
          `/api/mcp/sign-in/${encodeURIComponent(flowId)}`,
        )
        return {
          ok: true,
          value: unwrap<{ state: 'pending' | 'authorized' | 'failed'; message?: string }>(body),
        }
      } catch (e) {
        return { ok: false, error: toMcpError(e) } as Outcome<never>
      }
    },
    async submit(flowId, redirectUrl) {
      try {
        await requestJson(deps, `/api/mcp/sign-in/${encodeURIComponent(flowId)}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ redirectUrl }),
        })
        return { ok: true }
      } catch (e) {
        return { ok: false, error: toMcpError(e) }
      }
    },
    async cancel(flowId) {
      try {
        await requestJson(deps, `/api/mcp/sign-in/${encodeURIComponent(flowId)}`, {
          method: 'DELETE',
        })
        return { ok: true }
      } catch (e) {
        return { ok: false, error: toMcpError(e) }
      }
    },
  }
}
