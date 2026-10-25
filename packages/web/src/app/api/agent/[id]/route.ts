/**
 * H2 的 agent 传输通道：`GET` = SSE 事件流，`POST` = 命令，`GET ?snapshot=1` = 当前状态。
 *
 * 存在理由：C-A 的实现（6 模块 / 45 单测）此前只能靠单测验，44 条端到端 e2e 全是
 * `test.fixme`——因为 `AgentTransport` 端口没有 HTTP 承载。这条路由把端口接出来，
 * 让"界面 → 命令 → 后端 → 事件流 → 界面"这条链路可以真跑。
 *
 * 边界：不负责会话历史（那是 `/api/sessions/[id]`），只管"这一轮怎么跑"。
 */
import { type NextRequest, NextResponse } from 'next/server'
import { agentSnapshot, dispatchAgent, subscribeAgent } from '@/lib/agent-runtime-server'

export const dynamic = 'force-dynamic'

const encoder = new TextEncoder()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params
  if (!id) return NextResponse.json({ error: 'invalid-request' }, { status: 400 })

  // 一次性取状态：给"进页面先看现在跑到哪"用（比开 SSE 再关掉省事）
  if (request.nextUrl.searchParams.get('snapshot') === '1') {
    return NextResponse.json({ state: agentSnapshot(id) })
  }

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: unknown) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      // 订阅即先推一次当前状态：SSE 客户端连上来就能渲染，不用等第一个事件
      const unsubscribe = subscribeAgent(id, (e) => send(e))
      const heartbeat = setInterval(() => controller.enqueue(encoder.encode(': ping\n\n')), 15000)
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat)
        unsubscribe()
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
    },
  })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid-request' }, { status: 400 })
  }
  const rec = (body ?? {}) as {
    command?: unknown
    text?: unknown
    mode?: unknown
    clientRequestId?: unknown
  }
  const command = String(rec.command ?? '')
  if (!['prompt', 'abort', 'compact'].includes(command))
    return NextResponse.json(
      { error: 'invalid-request', detail: 'command 只能是 prompt/abort/compact' },
      { status: 400 },
    )

  const mode = rec.mode === 'followUp' ? 'followUp' : rec.mode === 'steer' ? 'steer' : undefined
  const res = await dispatchAgent(id, {
    command: command as 'prompt' | 'abort' | 'compact',
    ...(typeof rec.text === 'string' ? { text: rec.text } : {}),
    ...(mode ? { mode } : {}),
    ...(typeof rec.clientRequestId === 'string' ? { clientRequestId: rec.clientRequestId } : {}),
  })
  if (!res.ok) return NextResponse.json({ error: res.error?.code ?? 'internal' }, { status: 400 })
  return NextResponse.json({ ok: true, state: agentSnapshot(id) })
}
