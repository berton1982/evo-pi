// 设计骨架：进 tsc，编译不过就是设计没定稿。
// 这里只有类型，没有实现——实现放 C5，落点见 design/components.md 的「落点」列。
// 跑：npx --no-install tsc --noEmit --strict --skipLibCheck --target es2022 --module esnext design/interfaces.ts

/** 服务器引用：全局/项目两个作用域 + 名字唯一 */
export type McpScope = 'user' | 'project'

export interface McpServerRef {
  scope: McpScope
  name: string
}

export interface McpServerSummary extends McpServerRef {
  enabled: boolean
  transport: string
  sourcePath: string
}

export interface McpTestResult {
  ok: boolean
  tools?: string[]
  durationMs?: number
  error?: { code: string; message: string; timedOut?: boolean }
}

/** 用例返回结果对象，不抛业务错误（PR-01…PR-08 的公共约定） */
export interface Outcome<T> {
  ok: boolean
  value?: T
  error?: { code: string; message: string; timedOut?: boolean; retryable?: boolean }
}

/** P-S-01 */
export interface McpRepository {
  list(cwd: string | null): Promise<Outcome<McpServerSummary[]>>
  /** 单条启用/停用；幂等（PR-03） */
  write(ref: McpServerRef, enabled: boolean, cwd: string | null): Promise<Outcome<void>>
  /** 添加；非幂等（PR-08） */
  add(input: { ref: McpServerRef; transport: string; command?: string; url?: string }, cwd: string | null): Promise<Outcome<void>>
  remove(ref: McpServerRef, cwd: string | null): Promise<Outcome<void>>
}

/** P-S-02 */
export interface McpTestRunner {
  run(ref: McpServerRef, cwd: string | null): Promise<Outcome<McpTestResult>>
}

/** P-S-03：签到流程由服务端持有（PR-05） */
export interface McpSignInFlow {
  begin(ref: McpServerRef, cwd: string | null): Promise<Outcome<{ flowId: string; url?: string }>>
  status(flowId: string): Promise<Outcome<{ state: 'pending' | 'authorized' | 'failed'; message?: string }>>
  submit(flowId: string, redirectUrl: string): Promise<Outcome<void>>
  cancel(flowId: string): Promise<Outcome<void>>
}

/** P-S-04：字段级写（PR-06 只传要写的字段） */
export interface ToolsSettingsWriter {
  write(
    fields: { mode?: 'on' | 'off'; inlineBudget?: number; preference?: string },
  ): Promise<Outcome<{ mode?: 'on' | 'off'; inlineBudget?: number }>>
}

/** P-S-05 */
export interface ProjectTrust {
  request(cwd: string | null): Promise<Outcome<void>>
}

/** 用例签名（D-B-01…D-B-06） */
export declare function loadMcpOverview(deps: { repository: McpRepository }): (cwd: string | null) => Promise<Outcome<McpServerSummary[]>>
export declare function testMcpServer(deps: { runner: McpTestRunner }): (ref: McpServerRef, cwd: string | null) => Promise<Outcome<McpTestResult>>
export declare function toggleMcpServer(deps: { repository: McpRepository }): (ref: McpServerRef, enabled: boolean, cwd: string | null) => Promise<Outcome<void>>
export declare function batchToggleMcpServers(deps: { repository: McpRepository; trust: ProjectTrust }): (
  refs: McpServerRef[],
  enabled: boolean,
  cwd: string | null,
) => Promise<{ succeeded: McpServerRef[]; failed: Array<{ ref: McpServerRef; error: { code: string; message: string } }> }>
export declare function startMcpSignIn(deps: { flow: McpSignInFlow }): (ref: McpServerRef, cwd: string | null) => Promise<Outcome<{ flowId: string }>>
export declare function saveCodemodeSettings(deps: { writer: ToolsSettingsWriter }): (
  fields: { mode?: 'on' | 'off'; inlineBudget?: number },
) => Promise<Outcome<{ mode?: 'on' | 'off'; inlineBudget?: number }>>

/** 视图状态（ST-01…ST-05 的对外形状） */
export interface McpViewState {
  overview: McpServerSummary[] | null
  overviewError: string | null
  loading: boolean
  selectedKey: string | null
  testResults: Record<string, McpTestResult>
  signIn: { flowId: string | null; state: 'idle' | 'waiting' | 'authorized' | 'failed' | 'cancelled' }
  codemode: { mode: 'on' | 'off'; inlineBudget: number; saving: boolean; saveError: string | null }
}
