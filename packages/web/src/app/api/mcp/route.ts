/**
 * @design D-B-01
 *
 * `GET /api/mcp` 列表、`POST /api/mcp` 开关/新增/删除。契约：`contracts/wire.md` 的 C-G 段。
 *
 * 错误一律走封闭码（`invalid-request` / `not-found` / `internal`），与 web 侧 `toMcpError` 对齐。
 */

import {
  addServer,
  findEntry,
  globalConfigPath,
  listServers,
  projectConfigPath,
  removeServer,
  setEnabled,
} from '@evo-pi/core/mcp/server'
import { NextResponse } from 'next/server'

export function GET(req: Request) {
  const cwd = new URL(req.url).searchParams.get('cwd') ?? undefined
  try {
    // paths 一起返回：弹窗是客户端组件，算不出服务端的绝对路径，空态要拿它做引导
    return NextResponse.json({
      servers: listServers(cwd),
      paths: { user: globalConfigPath(), project: cwd ? projectConfigPath(cwd) : null },
    })
  } catch (e) {
    return NextResponse.json({ code: 'internal', message: (e as Error).message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  let body: {
    action?: unknown
    scope?: unknown
    name?: unknown
    enabled?: unknown
    transport?: unknown
    command?: unknown
    url?: unknown
    cwd?: unknown
  }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json(
      { code: 'invalid-request', message: 'body 不是合法 JSON' },
      { status: 400 },
    )
  }
  const scope = body.scope === 'project' ? 'project' : body.scope === 'user' ? 'user' : undefined
  const name = typeof body.name === 'string' && body.name ? body.name : undefined
  if (!scope || !name)
    return NextResponse.json(
      { code: 'invalid-request', message: '缺 scope 或 name' },
      { status: 400 },
    )
  try {
    // 新增：空态里的"就地添加"。没有这个分支，配置为空的用户只能去手改 JSON
    if (body.action === 'add') {
      const command = typeof body.command === 'string' ? body.command.trim() : undefined
      const url = typeof body.url === 'string' ? body.url.trim() : undefined
      if (!command && !url)
        return NextResponse.json(
          { code: 'invalid-request', message: '新增 server 必须给 command 或 url' },
          { status: 400 },
        )
      const path = addServer(
        scope,
        name,
        { ...(command ? { command } : {}), ...(url ? { url } : {}) },
        typeof body.cwd === 'string' ? body.cwd : undefined,
      )
      return NextResponse.json({
        servers: listServers(typeof body.cwd === 'string' ? body.cwd : undefined),
        path,
      })
    }
    if (typeof body.enabled === 'boolean') {
      const path = setEnabled(
        scope,
        name,
        body.enabled,
        typeof body.cwd === 'string' ? body.cwd : undefined,
      )
      return NextResponse.json({
        servers: listServers(typeof body.cwd === 'string' ? body.cwd : undefined),
        path,
      })
    }
    const entry = findEntry(scope, name, typeof body.cwd === 'string' ? body.cwd : undefined)
    if (!entry)
      return NextResponse.json(
        { code: 'not-found', message: `没有这个 server：${name}` },
        { status: 404 },
      )
    return NextResponse.json({ server: { scope, name, ...entry } })
  } catch (e) {
    const message = (e as Error).message
    // "没有这个 server" 是用户可修的状态，其余当内部错误
    const status = message.includes('没有这个 server') ? 404 : 500
    return NextResponse.json(
      { code: status === 404 ? 'not-found' : 'internal', message },
      { status },
    )
  }
}

/**
 * `DELETE /api/mcp` —— 移除一条 server。
 *
 * 为什么不用 `POST {action:"remove"}`：契约里删除是 DELETE（`wire.md` C-G 段），
 * 而且删除是幂等的——重复删除返回 200 而不是 404，两个标签页同时点不会有一个看到报错。
 */
export async function DELETE(req: Request) {
  // 不用 `typeof body` 自引用（TS 会推成 never）：先按 unknown 收，再逐字段断言
  let body: unknown = null
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { code: 'invalid-request', message: 'body 不是 JSON' },
      { status: 400 },
    )
  }
  const rec = (body ?? {}) as { scope?: unknown; name?: unknown; cwd?: unknown }
  const scope = rec.scope
  const name = rec.name
  const cwd = typeof rec.cwd === 'string' ? rec.cwd : undefined
  if (scope !== 'user' && scope !== 'project')
    return NextResponse.json(
      { code: 'invalid-request', message: 'scope 必须是 user|project' },
      { status: 400 },
    )
  if (typeof name !== 'string' || !name)
    return NextResponse.json({ code: 'invalid-request', message: '缺 name' }, { status: 400 })
  try {
    const path = removeServer(scope, name, cwd)
    return NextResponse.json({ removed: true, path })
  } catch (e) {
    const message = (e as Error).message
    if (message.includes('配置文件不存在'))
      return NextResponse.json({ code: 'not-found', message }, { status: 404 })
    return NextResponse.json({ code: 'internal', message }, { status: 500 })
  }
}
