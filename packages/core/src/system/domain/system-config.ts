import type { Cwd } from '../../_shared/domain/cwd'

/**
 * SystemConfig — 系统级配置快照（per plan §1C.1 task 15）。
 *
 * Phase 1 最小字段集：
 * - defaultCwd: 列 session 时的 cwd（PR.C 默认值 = process.cwd()）
 * - agentDir: 存储路径（默认 ~/.pi/agent；可被 PI_CODING_AGENT_DIR 覆盖）
 *
 * pi-web 没有统一 SystemConfig 类型（系统级配置散落在各 lib/）；
 * evo-pi 抽到 core/system 是为了后续 phase 统一 access path。
 *
 * 为什么用 plain object interface 而非 branded type：
 * - port 边界已经有 Cwd / Path 校验，SystemConfig 内部不需要再 brand
 * - 与 SDK SessionInfo 风格保持一致（plain interface）
 */

export interface SystemConfig {
  /** 默认 cwd（list-sessions 起点） */
  defaultCwd: Cwd
  /** agent 数据目录（sessions / trust.json / scan-index 都在它下面） */
  agentDir: string
}

/**
 * SystemConfigPort — 读 system config 的端口。
 *
 * 实现由 adapters/ 提供：
 * - InMemorySystemAdapter: Phase 1 测试 + PR.C 真实使用（读 env）
 * - 后续 phase: FileSystemSystemAdapter 读 ~/.pi/agent/settings.json
 */
export interface SystemConfigPort {
  getConfig(): SystemConfig
}
