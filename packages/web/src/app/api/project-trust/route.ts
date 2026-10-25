/**
 * @design D-B-02
 *
 * `POST /api/project-trust`：记录"这个目录我信"。存 `agentDir/trust.json`，形状 `{ [cwd]: { trusted, at } }`。
 * 只在本能力里用于"信任后重试原动作"，不是完整的信任模型。
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { agentDir } from '@evo-pi/core/mcp/server'
import { NextResponse } from 'next/server'

export async function GET() {
  // 项目选择器要的是"我知道哪几个项目"：trust.json 就是这台机器上被用过/信任过的目录清单。
  // 不接受客户端传 cwd 来列举（那等于让任意路径来探库）。
  const path = `${agentDir()}/trust.json`
  const all = existsSync(path)
    ? (JSON.parse(readFileSync(path, 'utf8')) as Record<string, { trusted?: boolean }>)
    : {}
  const projects = Object.entries(all)
    .filter(([, v]) => v?.trusted !== false)
    .map(([cwd]) => cwd)
    .sort()
  return NextResponse.json({ projects })
}

export async function POST(req: Request) {
  let body: { cwd?: unknown }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json(
      { code: 'invalid-request', message: 'body 不是合法 JSON' },
      { status: 400 },
    )
  }
  if (typeof body.cwd !== 'string')
    return NextResponse.json({ code: 'invalid-request', message: '缺 cwd' }, { status: 400 })
  const cwd = resolve(body.cwd)
  const path = `${agentDir()}/trust.json`
  const current = existsSync(path)
    ? (JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>)
    : {}
  current[cwd] = { trusted: true, at: new Date().toISOString() }
  writeFileSync(path, `${JSON.stringify(current, null, 2)}\n`)
  return NextResponse.json({ cwd, trusted: true })
}
