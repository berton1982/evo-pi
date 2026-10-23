/**
 * system 公共导出（per packages/core/package.json:exports ./system/*）。
 *
 * Phase 1 范围：
 * - domain: SystemConfig / SystemConfigPort / ProjectTrustPort / ProjectTrustStatus
 * - use-cases: makeGetSystemConfig / makeCheckProjectTrust (factories)
 * - adapters: createInMemorySystemAdapter (Phase 1 minimum)
 *
 * 后续 phase 按需追加 use-cases（如 set-system-config）和 adapters（FileSystem / SDK-backed）。
 */

export { createInMemorySystemAdapter } from './adapters/in-memory-system-adapter'
export type { ProjectTrustPort, ProjectTrustStatus } from './domain/project-trust'
export type { SystemConfig, SystemConfigPort } from './domain/system-config'
export { makeCheckProjectTrust } from './use-cases/check-project-trust'
export { makeGetSystemConfig } from './use-cases/get-system-config'
