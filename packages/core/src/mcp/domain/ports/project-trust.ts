import type { Outcome } from '../mcp-types'

/**
 * @design P-S-05 项目信任（P-S-05）。契约：POST /api/project-trust */
export interface ProjectTrustPort {
  request(cwd: string | null): Promise<Outcome<void>>
}
