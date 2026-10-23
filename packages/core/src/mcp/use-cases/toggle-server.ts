import type { McpServerRef, McpServerSummary, Outcome } from '../domain/mcp-types'
import type { McpRepository } from '../domain/ports'

/**
 * @design D-B-03
 * 单条启用/停用（D-B-03，行为 B-011 / B-012 / B-013）。
 *
 * 用例只负责「调端口 + 把失败原样返回」；**乐观写与回滚在 hook 里**（H-02），
 * 因为回滚要改的是视图状态，用例不该知道 store 的存在。
 * 但「需要信任」要在这里翻译成 `trustRequired`，否则 hook 得去认服务端错误码。
 */
export interface ToggleResult extends Outcome<void> {
  /** 端口拒绝的原因是否属于「先要项目信任」 */
  trustRequired?: boolean
}

export function createToggleServer(deps: { repository: McpRepository }) {
  return async function toggleServer(
    ref: McpServerRef,
    enabled: boolean,
    cwd: string | null,
  ): Promise<ToggleResult> {
    const result = await deps.repository.write(ref, enabled, cwd)
    if (result.ok) return { ok: true }
    const code = result.error?.code ?? ''
    return {
      ok: false,
      error: result.error,
      trustRequired: code === 'untrusted' || code === 'trust_required',
    }
  }
}

/** 供 hook 使用：把服务端返回的清单替换成「已按本次批量结果更新」的新快照 */
export function withServerState(
  servers: McpServerSummary[],
  ref: McpServerRef,
  enabled: boolean,
): McpServerSummary[] {
  return servers.map((s) => (s.scope === ref.scope && s.name === ref.name ? { ...s, enabled } : s))
}
