import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { NextResponse } from 'next/server'

/**
 * GET /api/version — 版本信息（项目选择器面板底部显示用）。
 *
 * 为什么读 package.json 而不是注入环境变量：环境变量要构建时烘进去，
 * 版本号一改就得重建；这里每次请求读盘（2 个小文件，可忽略），代价是
 * "部署了新版本但进程没重启"时显示的是磁盘上的真值——这正是我们要的。
 */
function versionOf(...segs: string[]): string {
  try {
    const raw = readFileSync(join(process.cwd(), ...segs), 'utf8')
    const pkg = JSON.parse(raw) as { version?: string }
    return pkg.version ?? 'unknown'
  } catch {
    return 'unknown'
  }
}

export function GET(): NextResponse {
  return NextResponse.json({
    // process.cwd() 在 next start/next dev 下是 packages/web
    web: versionOf('package.json'),
    core: versionOf('..', 'core', 'package.json'),
  })
}
