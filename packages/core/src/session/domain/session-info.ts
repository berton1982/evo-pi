/**
 * SessionInfo re-exports from SDK + pi-web local extensions.
 *
 * 策略（per capability-boundary-final §5.4）：evo-pi 直接 re-export SDK 类型；
 * SDK 升级时自动跟随。SDK 1.1.0 的 SessionInfo 是 11 字段底层形态；pi-web 的
 * SessionInfo（17 字段）是扩展 view（含 parentSessionId、relation、projectRoot、
 * projectKey、branch、isWorktree、transient）。
 *
 * Phase 0 范围：re-export SDK 实际导出的类型。缺失的扩展字段（BranchPreview、
 * SubagentSessionStatus）作为 pi-web-local 类型定义在此——mirror pi-web 的
 * lib/types.ts:347-348 形状。
 *
 * Ruling — SDK v1.1.0 does not export BranchPreview / SubagentSessionStatus;
 * these are pi-web extensions. Define locally with pi-web's shape. When SDK
 * adds these types later, switch to re-exports. Cost if wrong: trivial swap.
 */

// SDK 直接导出的类型（底层 11 字段）
export type { SessionInfo, SessionTreeNode } from '@earendil-works/pi-coding-agent'

// pi-web local extensions (mirror lib/types.ts:347-348)
// Phase 0 仅类型定义；使用方后续由 session-info scanner 计算后填入
export interface BranchPreview {
  role?: 'user' | 'assistant'
  text: string
}

// SDK v1.1.0 不导出此类型；本地定义。mirror pi-web lib/types.ts:349-357
// 七态：starting | queued | running | completed | failed | aborted | interrupted
export type SubagentSessionStatus =
  | 'starting'
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'aborted'
  | 'interrupted'
