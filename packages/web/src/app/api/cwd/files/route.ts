import {
  createFsFilesRepository,
  createListWorkspace,
  type WorkspaceEntry,
} from '@evo-pi/core/files'
import { NextResponse } from 'next/server'

/**
 * `GET /api/cwd/files?cwd=<abs>&path=<rel>&hidden=1`
 *
 * 只列一层（展开由 UI 按需请求），失败也返回 200 + `error` 字段：
 * 文件树是辅助信息，读不了要显示原因，而不是让整页 500。
 */
export const dynamic = 'force-dynamic'

const listWorkspace = createListWorkspace({ repository: createFsFilesRepository() })

export async function GET(req: Request): Promise<NextResponse> {
  const url = new URL(req.url)
  const cwd = url.searchParams.get('cwd')
  if (!cwd) {
    return NextResponse.json(
      { entries: [], error: { code: 'invalid-request', message: '缺 cwd' } },
      { status: 400 },
    )
  }
  const res = await listWorkspace.list({
    cwd,
    path: url.searchParams.get('path') ?? '',
    showIgnored: url.searchParams.get('hidden') === '1',
  })
  return NextResponse.json(res as { entries: WorkspaceEntry[]; error?: unknown })
}
