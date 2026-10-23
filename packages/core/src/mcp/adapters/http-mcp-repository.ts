/**
 * @design P-S-01
 *
 * `McpRepository` 的 HTTP 实现。契约：`GET/POST /api/mcp`（wire.md 的 C-G 段）。
 *
 * 为什么 `add` 与 `write` 分成两个请求：服务端 `POST /api/mcp` 的 body 不同——
 * `write` 传 `{scope,name,enabled}`，`add` 传 `{scope,name,transport,command|url}`。
 * 合成一个"万能 body"会让服务端要靠字段猜意图（pi-web 正是这么做的，`mcp-config-helpers.ts`）。
 */

import type { Outcome } from '../domain/mcp-types'
import type { McpRepository } from '../domain/ports'
import { requestJson, toMcpError, unwrap } from './error-mapping'

export interface HttpAdapterDeps {
  /** 注入点：测试里替换成假 fetch，不必起服务 */
  fetchImpl?: typeof fetch
}

export function createHttpMcpRepository(deps: HttpAdapterDeps = {}): McpRepository {
  return {
    async list(cwd) {
      try {
        const body = await requestJson<{ servers?: unknown[] }>(
          deps,
          `/api/mcp${cwd ? `?cwd=${encodeURIComponent(cwd)}` : ''}`,
        )
        return { ok: true, value: (body.servers ?? []) as never }
      } catch (e) {
        return { ok: false, error: toMcpError(e) } as Outcome<never>
      }
    },
    async write(ref, enabled, cwd) {
      try {
        await requestJson(deps, '/api/mcp', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ scope: ref.scope, name: ref.name, enabled, cwd }),
        })
        return { ok: true }
      } catch (e) {
        return { ok: false, error: toMcpError(e) }
      }
    },
    async add(input, cwd) {
      try {
        const body = await requestJson<unknown>(deps, '/api/mcp', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action: 'add', ...input.ref, ...input, cwd }),
        })
        const payload = unwrap<{ added?: never; servers?: unknown[] }>(body)
        return {
          ok: true,
          value: { added: payload.added, servers: (payload.servers ?? []) as never },
        }
      } catch (e) {
        return { ok: false, error: toMcpError(e) } as Outcome<never>
      }
    },
    async remove(ref, cwd) {
      try {
        await requestJson(deps, '/api/mcp', {
          method: 'DELETE',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ scope: ref.scope, name: ref.name, cwd }),
        })
        return { ok: true }
      } catch (e) {
        return { ok: false, error: toMcpError(e) }
      }
    },
  }
}
