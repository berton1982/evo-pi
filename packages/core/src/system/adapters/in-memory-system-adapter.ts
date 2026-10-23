import { type Cwd, cwd as makeCwd } from '../../_shared/domain/cwd'
import type { ProjectTrustPort, ProjectTrustStatus } from '../domain/project-trust'
import type { SystemConfig, SystemConfigPort } from '../domain/system-config'

/**
 * InMemorySystemAdapter — 系统 capability 的内存实现（Phase 1 minimum）。
 *
 * 行为：
 * - getConfig: 返回默认 SystemConfig（cwd = process.cwd(), agentDir = env or ~/.pi/agent）
 * - checkTrust: 永远返回 trusted=true（Phase 1 不接 SDK ProjectTrustStore）
 *
 * PR.C 真实使用：route.ts 调 makeGetSystemConfig + makeCheckProjectTrust 时注入本 adapter。
 *
 * 后续 phase：替换为 FileSystemSystemAdapter（读 ~/.pi/agent/settings.json）
 * 或 SDK-backed adapter（用 ProjectTrustStore）。
 */

const DEFAULT_AGENT_DIR = '~/.pi/agent'

/**
 * Resolve agent dir: $PI_CODING_AGENT_DIR env override, else ~/.pi/agent.
 *
 * Per MEMORY §6.1 — 测试用 env override 不污染 live data；本函数读 env 不写。
 *
 * Tilde (`~`) expansion: env override is used literally (test fixture paths are
 * absolute). Default `~/.pi/agent` is expanded to the user's home dir via
 * os.homedir() — Node's fs APIs do NOT auto-expand `~` (verified by
 * existsSync('~/foo') returning false).
 */
function resolveAgentDir(): string {
  if (process.env.PI_CODING_AGENT_DIR) return process.env.PI_CODING_AGENT_DIR
  const home = process.env.HOME ?? process.env.USERPROFILE ?? ''
  return home ? `${home}/.pi/agent` : DEFAULT_AGENT_DIR
}

export function createInMemorySystemAdapter(): SystemConfigPort & ProjectTrustPort {
  return {
    getConfig(): SystemConfig {
      // process.cwd() is the absolute path; brand as Cwd for type safety.
      const cwdValue = makeCwd(process.cwd())
      return {
        defaultCwd: cwdValue,
        agentDir: resolveAgentDir(),
      }
    },

    checkTrust(_cwd: Cwd): ProjectTrustStatus {
      // Phase 1: every cwd trusted. Phase 2+ swaps in real SDK integration.
      return {
        requiresTrust: false,
        trusted: true,
        decision: null,
        inherited: false,
      }
    },
  }
}
