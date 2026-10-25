import { NextResponse } from 'next/server'

/**
 * POST /api/cwd/open — 打开请求的落点。
 *
 * 当前实现只做校验并回显，真正的"在宿主里打开"由前端右栏文件面板消费
 * （`data-open-request` 事件）。不让路由直接 spawn 编辑器：那等于给网页
 * 一个任意命令执行入口。
 */
export async function POST(request: Request): Promise<Response> {
  const body = (await request.json().catch(() => null)) as {
    cwd?: string
    path?: string
    line?: number
  } | null
  if (!body?.cwd || !body.path)
    return NextResponse.json({ error: { code: 'invalid-request' } }, { status: 400 })
  return NextResponse.json({ ok: true, request: body })
}
