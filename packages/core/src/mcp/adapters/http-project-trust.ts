/**
 * @design P-S-05
 *
 * `ProjectTrustPort` 的 HTTP 实现。契约：`POST /api/project-trust`。
 * 信任动作本身失败时**不能**自动重试——重试等于替用户签字。
 */

import type { Outcome } from '../domain/mcp-types'
import type { ProjectTrustPort } from '../domain/ports'
import { requestJson, toMcpError } from './error-mapping'

export function createHttpProjectTrust(deps: { fetchImpl?: typeof fetch } = {}): ProjectTrustPort {
  return {
    async request(cwd) {
      try {
        const init: RequestInit = {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ cwd }),
        }
        await requestJson(deps, '/api/project-trust', init)
        return { ok: true }
      } catch (e) {
        return { ok: false, error: toMcpError(e) } as Outcome<never>
      }
    },
  }
}
