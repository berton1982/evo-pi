import { expect, test } from '@playwright/test'
import { snapshot } from './helpers'

/**
 * queue_update 用整份队列覆盖本地队列，不做增量拼接
 *
 * C-A 是运行时能力（4 文件 7,669 行），核心断言在 core 单测里（`packages/core/src/agent` 下的 test 文件，41 条）。**覆盖来源**：core 单测（`packages/core/src/agent` 下的 test 文件，47 条）。这类行为是纯事件归约或领域规则，浏览器侧没有独立观察点；`/api/agent` 的 SSE 已落地，能端到端验的三条（命令分发、事件序列、压缩）已在 `s-001`～`s-008` 转真。保留 fixme 只为让 registry 的 44 条脚本文件仍在（`behaviorScripts` 结构绿），不是留给将来在这里补断言。
 */
test('B-013 queue_update：运行中的新提示进排队而不是并发发送', async ({ request }) => {
  const sessionId = `s-021-${Date.now()}`
  await request.post(`/api/agent/${sessionId}`, { data: { command: 'prompt', text: '第一轮' } })
  // 先确认第一轮真的在跑：事件分批到达，POST 返回时往往还是 idle，
  // 这时发第二条会被当成"新一轮"而不是"排队"（早先这条用例就是这么假绿的）。
  await expect
    .poll(async () => (await snapshot(request, sessionId)).phase, { timeout: 15000 })
    .toBe('running')
  // 运行中再发一条 → 只排队不发请求
  const second = await request.post(`/api/agent/${sessionId}`, {
    data: { command: 'prompt', text: '第二句' },
  })
  expect(((await second.json()) as { ok: boolean }).ok).toBe(true)

  // 立刻读：排队数应当在第一轮还在跑的时候就是 1
  await expect.poll(async () => (await snapshot(request, sessionId)).queued).toBe(1)

  // 第一轮收尾后队列要清空（否则"排队"就变成永久挂起）
  await expect
    .poll(
      async () =>
        (
          (await (await request.get(`/api/agent/${sessionId}?snapshot=1`)).json()) as {
            state: { queued: number }
          }
        ).state.queued,
      { timeout: 15000 },
    )
    .toBe(0)
})
