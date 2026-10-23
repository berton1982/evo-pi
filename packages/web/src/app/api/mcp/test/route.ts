/**
 * @design D-B-04
 *
 * `POST /api/mcp/test`：对单个 server 做真实握手（stdio 起进程 → initialize → tools/list）。
 * 契约：`contracts/wire.md` 的 C-G 段；结果形状对齐 `McpTestResult`。
 */

import { findEntry, testStdio } from '@evo-pi/core/mcp/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  let body: { scope?: unknown; name?: unknown; cwd?: unknown }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: 'invalid-request', message: 'body 不是合法 JSON' } },
      { status: 400 },
    )
  }
  const scope = body.scope === 'project' ? 'project' : 'user'
  const name = typeof body.name === 'string' ? body.name : ''
  const cwd = typeof body.cwd === 'string' ? body.cwd : undefined
  const entry = findEntry(scope, name, cwd)
  if (!entry)
    return NextResponse.json(
      { ok: false, error: { code: 'not-found', message: `没有这个 server：${name}` } },
      { status: 404 },
    )
  if (entry.url)
    return NextResponse.json({
      ok: true,
      tools: [],
      durationMs: 0,
      note: 'http 传输由客户端连接时校验',
    })
  return NextResponse.json(await testStdio(entry))
}
