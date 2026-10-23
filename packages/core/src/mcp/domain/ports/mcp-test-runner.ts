import type { McpServerRef, McpTestResult, Outcome } from '../mcp-types'

/**
 * @design P-S-02 按 key 发起一次测试（P-S-02）。契约：POST /api/mcp/test */
export interface McpTestRunner {
  run(ref: McpServerRef, cwd: string | null): Promise<Outcome<McpTestResult>>
}
