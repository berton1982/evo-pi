import type { McpServerRef, Outcome } from '../mcp-types'

/**
 * @design P-S-03
 * 签到流程（P-S-03）。契约：POST /api/mcp/sign-in 与 GET/POST/DELETE /api/mcp/sign-in/[flowId]。
 *
 * 注意：流程状态在服务端，`pending` 期间客户端只能轮询；`cancel` 才真的终止流程。
 * 组件卸载不算取消——那会把用户在浏览器里正在做的授权掐掉。
 */
export interface McpSignInFlowPort {
  begin(ref: McpServerRef, cwd: string | null): Promise<Outcome<{ flowId: string; url?: string }>>
  status(
    flowId: string,
  ): Promise<Outcome<{ state: 'pending' | 'authorized' | 'failed'; message?: string }>>
  submit(flowId: string, redirectUrl: string): Promise<Outcome<void>>
  cancel(flowId: string): Promise<Outcome<void>>
}
