'use client'
// 客户端组件/钩子：这里用 state、effect、事件处理器。显式声明比靠父层推导安全——
// 一旦有人把它 import 进服务端组件，Next 会在构建期报错，而不是运行时才炸。
/**
 * @design H-02
 *
 * 动作层：开关、组批量、测试。
 *
 * Code mode 保存本次不迁（见 `spec.md` 不做清单），所以不再注入 ToolsSettingsWriter。
 *
 * 为什么用工厂而不是直接 import 适配器：用例只依赖端口（PR-01），
 * 组件测试注入假端口即可，不必起 HTTP。pi-web 里这些动作直接 `fetch` 在组件里（`McpConfig.tsx:600-845`），
 * 结果是每个动作都要在测试里 mock 全局 fetch。
 *
 * 分工：用例负责「调端口 + 翻译错误码」，本层负责「把结果摊平成组件好用的形状」。
 * 乐观写与回滚不在这里——那要改 store（`ST-01`），见 `mcp-overview-store` 的 `applyOptimistic`。
 */

import type {
  McpRepository,
  McpServerSummary,
  McpTestRunner,
  Outcome,
  ProjectTrustPort,
} from '@evo-pi/core/mcp'
import { batchSummary, createBatchActions, createToggleServer, serverKey } from '@evo-pi/core/mcp'

export interface McpActionDeps {
  repo: McpRepository
  tests: McpTestRunner
  trust: ProjectTrustPort
  cwd: string | null
}

export interface ToggleOutcome extends Outcome<void> {
  trustRequired?: boolean
}

export interface GroupToggleOutcome {
  ok: boolean
  changed: string[]
  failedKeys: string[]
  skippedKeys: string[]
}

export function createMcpActions(deps: McpActionDeps) {
  const toggleServer = createToggleServer({ repository: deps.repo })
  const batchToggle = createBatchActions({ repository: deps.repo, trust: deps.trust })

  return {
    /** 单条开关：`trustRequired` 由用例翻译，组件据此弹信任对话框 */
    async toggle(server: McpServerSummary, enabled: boolean): Promise<ToggleOutcome> {
      const ref = { scope: server.scope, name: server.name }
      return toggleServer(ref, enabled, deps.cwd)
    },

    /** 组批量：部分成功也返回；失败的逐条记账，不回滚已成功的 */
    async toggleGroup(servers: McpServerSummary[], enabled: boolean): Promise<GroupToggleOutcome> {
      const refs = servers.map((s) => ({ scope: s.scope, name: s.name }))
      const outcome = await batchToggle(refs, enabled, deps.cwd)
      const summary = batchSummary(outcome)
      // changed 必须来自用例的 succeeded，不能按「前 N 个」推——失败的可能在中间
      const bad = new Set([...summary.failedKeys, ...summary.skippedKeys])
      return {
        ok: summary.failedKeys.length === 0,
        changed: refs.map(serverKey).filter((k) => !bad.has(k)),
        failedKeys: summary.failedKeys,
        skippedKeys: summary.skippedKeys,
      }
    },

    /** 单条测试：同一 key 在飞时由调用方（store 的 running）去重 */
    async test(server: McpServerSummary) {
      return deps.tests.run({ scope: server.scope, name: server.name }, deps.cwd)
    },

    /** 移除：成功后才允许调用方把本地条目删掉（失败不能先删） */
    async remove(server: McpServerSummary) {
      return deps.repo.remove({ scope: server.scope, name: server.name }, deps.cwd)
    },

    key: serverKey,
  }
}
