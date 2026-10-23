/**
 * @design D-U-01
 * @design D-S-01
 * 分组与组头文案（对应 pi-web `McpConfig.tsx` L1-L294 里与"组"有关的部分）。
 *
 * 为什么这些函数在 core 而不是 web：它们只依赖「翻译函数 + 数据」，不碰 DOM。
 * pi-web 里它们和 2258 行的组件混在一起，导致「换一个词」也要读组件；
 * 拆到 core 后可以按 i18n 键逐条断言（behaviors B-006 / B-008，测试 T-01 / T-02 / T-03）。
 */

import type { McpScope, McpServerSummary } from './mcp-types'

/** 翻译函数的最小形状：只要 key + 可选参数。web 侧传 `useI18n().t` */
export type Translate = (key: string, params?: Record<string, string | number>) => string

export function scopeLabel(scope: McpScope, t: Translate): string {
  return scope === 'project' ? t('mcp.inProject') : t('mcp.userScope')
}

/** 组头文案：`enabled/total`，pi-web 的 `groupStatusText` */
export function groupStatusText(servers: McpServerSummary[], t: Translate): string {
  const total = servers.length
  const enabled = servers.filter((s) => s.enabled).length
  return t('mcp.groupStatus', { enabled, total })
}

/**
 * 按作用域分组：派生数据，不落 store（design/components.md §5「派生状态不落库」）。
 * 顺序固定 user → project：分组顺序随数据变会让组头在两次渲染间跳动。
 */
export function groupByScope(
  servers: McpServerSummary[],
): Array<{ scope: McpScope; servers: McpServerSummary[] }> {
  const order: McpScope[] = ['user', 'project']
  return order
    .map((scope) => ({ scope, servers: servers.filter((s) => s.scope === scope) }))
    .filter((group) => group.servers.length > 0)
}

/** 批量开关的目标：只取与期望状态不同的那些（已经是目标态的不重复写） */
export function toggleTargets(servers: McpServerSummary[], enabled: boolean): McpServerSummary[] {
  return servers.filter((s) => s.enabled !== enabled)
}

/** 应用批量结果：成功的改状态，失败的保持原状态并记账（部分成功不回滚已成功的） */
export function applyBatchResults(
  servers: McpServerSummary[],
  refs: string[],
  enabled: boolean,
): McpServerSummary[] {
  const set = new Set(refs)
  return servers.map((s) => (set.has(`${s.scope}/${s.name}`) ? { ...s, enabled } : s))
}
