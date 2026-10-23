/**
 * system/domain 公共导出。
 *
 * Phase 1 范围：
 * - SystemConfig / SystemConfigPort（get-system-config use-case 的 port）
 * - ProjectTrustStatus / ProjectTrustPort（check-project-trust use-case 的 port）
 *
 * 后续 phase 按需追加：settings.json reader / provider config 等。
 */

export type { ProjectTrustPort, ProjectTrustStatus } from './project-trust'
export type { SystemConfig, SystemConfigPort } from './system-config'
