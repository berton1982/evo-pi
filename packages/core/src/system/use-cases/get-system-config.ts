import type { SystemConfig, SystemConfigPort } from '../domain/system-config'

/**
 * makeGetSystemConfig — factory for getSystemConfig use-case (per ADR 0003 §Layer Responsibilities).
 *
 * Pure function pattern: caller injects port; use-case is a thin pass-through.
 * This pattern enables:
 * - Test-time fake port injection (no SDK / fs dependency)
 * - Future SDK integration without rewriting callers
 *
 * @example
 *   const getConfig = makeGetSystemConfig({ config: inMemoryAdapter })
 *   const cfg = getConfig()  // { defaultCwd, agentDir }
 */
export function makeGetSystemConfig(deps: { config: SystemConfigPort }): () => SystemConfig {
  return () => deps.config.getConfig()
}
