/**
 * GET /api/app-update —— 应用更新检查。
 *
 * 行为对齐 `ref_projects/pi-web/app/api/app-update/route.ts`：只在有新版本时返回
 * `{version}`，同版本返回 `{version: 当前版本}`（前端用 shouldShowUpdate 判）。
 * 版本号来自本包 package.json，不编常量。
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

export const dynamic = 'force-dynamic'

export function GET(): Response {
  try {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as {
      version?: string
    }
    return Response.json({ version: pkg.version ?? '0.0.0' })
  } catch {
    // 读不到就当"没有更新"：检查更新失败不该打断会话
    return Response.json({ version: '' })
  }
}
