import type { McpServerRef, McpServerSummary, Outcome } from '../mcp-types'

/**
 * @design P-S-01
 * 读与写 MCP 服务器清单（P-S-01）。
 *
 * 为什么 `write` 是幂等的、`add` 不是：启用/停用是「让状态等于某值」，重放安全；
 * 添加是「插入一条」，重放会写两条。这个差别落在签名上，用例层就不必自己判断。
 * 契约：GET /api/mcp、POST /api/mcp（wire.md 的 C-G 段）。
 */
export interface McpRepository {
  list(cwd: string | null): Promise<Outcome<McpServerSummary[]>>
  write(ref: McpServerRef, enabled: boolean, cwd: string | null): Promise<Outcome<void>>
  add(
    input: { ref: McpServerRef; transport?: string; command?: string; url?: string },
    cwd: string | null,
  ): Promise<Outcome<{ added?: McpServerSummary; servers: McpServerSummary[] }>>
  remove(ref: McpServerRef, cwd: string | null): Promise<Outcome<void>>
}
