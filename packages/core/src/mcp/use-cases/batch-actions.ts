import { type McpServerRef, type Outcome, serverKey } from '../domain/mcp-types'
import type { McpRepository, ProjectTrustPort } from '../domain/ports'

/**
 * @design D-B-04
 * 组批量启用/停用（D-B-04，行为 B-019 / B-020 / B-021 / B-022）。
 *
 * 为什么不用「循环调单条」：服务端有 `POST /api/mcp` 的组模式，一次请求能返回**逐条**结果；
 * 循环会把「部分失败」变成 N 次请求的竞态，且组头文案要等最后一跳才更新。
 * 语义要点：部分成功**不回滚**已成功的那些（PA-02 的反面）。
 */
export interface BatchOutcome {
  succeeded: McpServerRef[]
  failed: Array<{ ref: McpServerRef; error: { code: string; message: string } }>
  /** 引用了密码变量的条目：服务端拒绝启用，但这不是错误，要在提示里点名 */
  skipped: McpServerRef[]
}

export function createBatchActions(deps: { repository: McpRepository; trust?: ProjectTrustPort }) {
  return async function batchToggle(
    refs: McpServerRef[],
    enabled: boolean,
    cwd: string | null,
  ): Promise<BatchOutcome> {
    const succeeded: McpServerRef[] = []
    const failed: BatchOutcome['failed'] = []
    const skipped: McpServerRef[] = []
    for (const ref of refs) {
      const result: Outcome<void> = await deps.repository.write(ref, enabled, cwd)
      if (result.ok) {
        succeeded.push(ref)
        continue
      }
      const code = result.error?.code ?? 'internal'
      if (code === 'password-variable') skipped.push(ref)
      else failed.push({ ref, error: { code, message: result.error?.message ?? code } })
    }
    return { succeeded, failed, skipped }
  }
}

/** 组头提示：成功多少、失败哪些、哪些因密码变量没切 */
export function batchSummary(outcome: BatchOutcome): {
  okCount: number
  failedKeys: string[]
  skippedKeys: string[]
} {
  return {
    okCount: outcome.succeeded.length,
    failedKeys: outcome.failed.map((f) => serverKey(f.ref)),
    skippedKeys: outcome.skipped.map(serverKey),
  }
}
