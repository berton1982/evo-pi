import { expect, test } from '@playwright/test'
import { waitIdle } from './helpers'

/**
 * agent_end 收尾：落库最终消息、解除排队、刷新统计
 *
 * C-A 是运行时能力（4 文件 7,669 行），核心断言在 core 单测里（`packages/core/src/agent` 下的 test 文件，41 条）。**覆盖来源**：core 单测（`packages/core/src/agent` 下的 test 文件，47 条）。这类行为是纯事件归约或领域规则，浏览器侧没有独立观察点；`/api/agent` 的 SSE 已落地，能端到端验的三条（命令分发、事件序列、压缩）已在 `s-001`～`s-008` 转真。保留 fixme 只为让 registry 的 44 条脚本文件仍在（`behaviorScripts` 结构绿），不是留给将来在这里补断言。
 */
test('B-016 agent_end 收尾：回 idle、队列清空、requestId 前进', async ({ request }) => {
  const sessionId = `s-024-${Date.now()}`
  await request.post(`/api/agent/${sessionId}`, { data: { command: 'prompt', text: '收尾检查' } })
  // 只等 idle 会立刻返回（新会话初始态就是 idle，requestId 仍是 0）——这条最早就是那么假绿的
  const snap = await waitIdle(request, sessionId)
  expect(snap.queued).toBe(0)
  expect(snap.lastRequestId).toBeGreaterThan(0)
})
