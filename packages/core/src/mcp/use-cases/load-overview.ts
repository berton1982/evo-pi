import {
  createLatestOnly,
  type LatestOnly,
  type McpServerSummary,
  type Outcome,
} from '../domain/mcp-types'
import type { McpRepository } from '../domain/ports'

/**
 * @design D-B-01
 * 读清单（D-B-01，行为 B-001 / B-002 / B-003）。
 *
 * 两条语义必须在这里定死，而不是交给页面：
 * 1. **失败整体降级**：读失败时返回失败结果，调用方保留上一次快照；
 *    与「单条动作失败」不同——那种要按 key 局部回填（见 test-server / toggle-server）。
 * 2. **后到的旧响应丢弃**：`latestOnly` 序号比对，旧响应不落库（PA-03）。
 */
export interface OverviewLoader {
  load(cwd: string | null): Promise<Outcome<McpServerSummary[]> | undefined>
}

export function createOverviewLoader(deps: {
  repository: McpRepository
  latestOnly?: LatestOnly
}): OverviewLoader {
  const latestOnly = deps.latestOnly ?? createLatestOnly()
  return {
    load(cwd) {
      return latestOnly.run(async (isCurrent) => {
        const result = await deps.repository.list(cwd)
        if (!isCurrent()) return undefined
        return result
      })
    },
  }
}
