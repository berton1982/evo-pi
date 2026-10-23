'use client'
// 客户端组件/钩子：这里用 state、effect、事件处理器。显式声明比靠父层推导安全——
// 一旦有人把它 import 进服务端组件，Next 会在构建期报错，而不是运行时才炸。
/**
 * @design H-01
 *
 * 清单加载：整体失败要降级、旧响应要丢弃。
 *
 * 为什么用 core 的 `createLatestOnly` 而不是组件内序号：序号逻辑一旦写在组件里，
 * 就没法单独测"后到的旧响应被丢弃"（pi-web 靠 `requestRef` 在组件内比对，`McpConfig.tsx:520`）。
 */

import type { McpRepository, Outcome } from '@evo-pi/core/mcp'
import { createOverviewLoader } from '@evo-pi/core/mcp'

export interface OverviewDeps {
  repo: McpRepository
  cwd: string | null
}

export function createMcpOverview({ repo, cwd }: OverviewDeps) {
  const loader = createOverviewLoader({ repository: repo })
  return {
    /** 返回 undefined 表示这次结果已经被后到的请求取代，调用方应当忽略 */
    async refresh(): Promise<Outcome<unknown[]> | undefined> {
      return loader.load(cwd)
    },
  }
}
