import type { Cwd } from '../../_shared/domain/cwd'

/**
 * ProjectTrustStatus — 项目的 trust 决策状态。
 *
 * Mirror pi-web `lib/api-types.ts` interface ProjectTrustStatus：
 *   ref_projects/pi-web/lib/api-types.ts:201-220
 *
 * Phase 1 最小字段集（其他字段 PR.D+ 才用）：
 * - requiresTrust: cwd 下是否有需要 trust 的资源（subagent/MCP 等）
 * - trusted: 当前 cwd 是否被信任
 * - decision: 最近 trust.json 记录的决策（true=trust, false=untrust, null=无记录）
 * - decisionPath: 决策所在目录（key of trust.json）
 * - inherited: 决策是从 ancestor 继承来的
 *
 * Phase 1 简化：
 * - 永远 trusted=true（无 SDK ProjectTrustStore integration）
 * - 后续 PR 用 SDK ProjectTrustStore 实现真实决策
 */

export interface ProjectTrustStatus {
  requiresTrust: boolean
  trusted: boolean
  decision: boolean | null
  decisionPath?: string
  inherited: boolean
  /** trust.json 读失败时携带；trusted=false 时也设 */
  decisionError?: string
}

/**
 * ProjectTrustPort — 读 project trust status 的端口。
 *
 * Phase 1: InMemorySystemAdapter 始终返回 trusted=true。
 * Phase 2+: 真实 SDK ProjectTrustStore 集成（per pi-web pattern）。
 */
export interface ProjectTrustPort {
  checkTrust(cwd: Cwd): ProjectTrustStatus
}
