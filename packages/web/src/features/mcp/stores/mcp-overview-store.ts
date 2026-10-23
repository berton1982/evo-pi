/**
 * @design ST-01
 *
 * MCP 服务器清单的持有者（唯一）。
 *
 * 为什么不放组件 useState：清单同时被组列表、详情、批量操作条读取，
 * pi-web 里靠 prop 一层层往下传（`McpConfig.tsx:295-831`），props 最终到 40+；
 * 拆出来后组件只订阅自己用到的切片。
 *
 * `groups` 是派生数据：由 `overview` 算出，不单独落库——两份状态会不同步。
 */

import type { McpError, McpServerSummary } from '@evo-pi/core/mcp'
import { groupByScope } from '@evo-pi/core/mcp'
import { create } from 'zustand'

export interface McpOverviewState {
  overview: McpServerSummary[] | null
  /** 整体加载失败：只有这一种情况整页报错，动作失败按 key 局部回填 */
  overviewError: McpError | null
  loading: boolean
  setOverview: (servers: McpServerSummary[] | null, error?: McpError | null) => void
  setLoading: (loading: boolean) => void
  reset: () => void
}

export const useMcpOverviewStore = create<McpOverviewState>((set) => ({
  overview: null,
  overviewError: null,
  loading: false,
  setOverview: (overview, overviewError = null) => set({ overview, overviewError, loading: false }),
  setLoading: (loading) => set({ loading }),
  reset: () => set({ overview: null, overviewError: null, loading: false }),
}))

/** 派生：按作用域分组（顺序固定 user → project，避免组头跳动） */
export function useMcpGroups(): Array<{ scope: 'user' | 'project'; servers: McpServerSummary[] }> {
  return groupByScope(useMcpOverviewStore((s) => s.overview) ?? [])
}
