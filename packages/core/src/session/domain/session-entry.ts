/**
 * SessionEntry type re-exports from SDK.
 *
 * JSONL 行类型（per study #3 §3.3）：
 * - SessionHeader: 文件首行（version、cwd 等元数据）
 * - SessionEntry: 每条消息/事件（11 个变体：message / compaction / model_change / ...）
 * - SessionEntryBase: SessionEntry 的共有字段
 *
 * 必须保持 v3 兼容（CURRENT_SESSION_VERSION = 3 per study #3 + #4）。
 * 任何修改都需确保与 SDK 同版本兼容，否则破坏与 pi-web 的 JSONL 互通。
 */

export type {
  BranchSummaryEntry,
  // 复合 entry（compaction / context edit / custom / file / model change / thinking level）
  CompactionEntry,
  ContextEditableContent,
  ContextEditEntry,
  CustomEntry,
  CustomMessageEntry,
  FileEntry,
  ModelChangeEntry,
  ProjectedSessionEntry,
  // 顶层 entry union（11 个变体）
  SessionEntry,
  // 共有字段
  SessionEntryBase,
  // 以下为 SDK v1.1.0 新增的 session-manager 类型
  SessionInfoEntry,
  // 各变体（按 study #3 列表）
  SessionMessageEntry,
  SessionProjection,
  ThinkingLevelChangeEntry,
} from '@earendil-works/pi-coding-agent'
