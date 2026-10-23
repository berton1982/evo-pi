import type { McpServerRef, Outcome } from '../domain/mcp-types'
import type { McpSignInFlowPort } from '../domain/ports'

/**
 * @design D-B-05
 * 签到（D-B-05，行为 B-027 / B-028 / B-029；PR-05）。
 *
 * 服务端持有流程，客户端每轮拿状态。三个语义：
 * - 轮询用**版本号**判断「这一轮的答案还算不算数」（pi-web 的 `version`，`McpConfig.tsx:538`）；
 * - `cancel` 才是真的终止；组件卸载只停止轮询，不发 DELETE；
 * - 失败保留 `flowId`，用户点重试时继续同一流程，而不是重新发起一个新的。
 */
export interface SignInSession {
  flowId: string
  round: number
  state: 'pending' | 'authorized' | 'failed'
  message?: string
}

export function createSignInFlow(deps: { flow: McpSignInFlowPort }) {
  return {
    async start(ref: McpServerRef, cwd: string | null): Promise<Outcome<SignInSession>> {
      const begun = await deps.flow.begin(ref, cwd)
      if (!begun.ok || !begun.value) return { ok: false, error: begun.error }
      return { ok: true, value: { flowId: begun.value.flowId, round: 0, state: 'pending' } }
    },

    async poll(session: SignInSession): Promise<Outcome<SignInSession>> {
      const result = await deps.flow.status(session.flowId)
      if (!result.ok || !result.value) return { ok: false, error: result.error }
      return {
        ok: true,
        value: {
          ...session,
          round: session.round + 1,
          state: result.value.state,
          message: result.value.message,
        },
      }
    },

    async submitRedirect(session: SignInSession, redirectUrl: string): Promise<Outcome<void>> {
      return deps.flow.submit(session.flowId, redirectUrl)
    },

    async cancel(session: SignInSession): Promise<Outcome<void>> {
      return deps.flow.cancel(session.flowId)
    },
  }
}

/** 只有更新的轮次才允许覆盖当前状态（旧轮次的答案直接忽略） */
export function mergeRound(current: SignInSession, next: SignInSession): SignInSession {
  return next.round > current.round ? next : current
}
