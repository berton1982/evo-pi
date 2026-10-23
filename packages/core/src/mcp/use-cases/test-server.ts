import { type McpServerRef, type McpTestResult, type Outcome, serverKey } from '../domain/mcp-types'
import type { McpTestRunner } from '../domain/ports'

/**
 * @design D-B-02
 * 单条测试（D-B-02，行为 B-030；PA-02）。
 *
 * 去重的键是 `scope/name`：用户连点同一台的测试按钮时只发一次请求，
 * 但**不同服务器可以并发**——全串行会让一台慢服务器阻塞其余（被否方案，见 patterns PA-02）。
 */
export interface TestCoordinator {
  test(ref: McpServerRef, cwd: string | null): Promise<Outcome<McpTestResult>>
  inFlight(): string[]
}

export function createTestCoordinator(deps: { runner: McpTestRunner }): TestCoordinator {
  const inflight = new Map<string, Promise<Outcome<McpTestResult>>>()
  return {
    test(ref, cwd) {
      const key = serverKey(ref)
      const existing = inflight.get(key)
      if (existing) return existing
      const run = deps.runner.run(ref, cwd).finally(() => {
        if (inflight.get(key) === run) inflight.delete(key)
      })
      inflight.set(key, run)
      return run
    },
    inFlight() {
      return [...inflight.keys()]
    },
  }
}
