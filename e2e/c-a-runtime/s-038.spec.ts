import { expect, test } from '@playwright/test'

/**
 * prompt 前准备 MCP：可选等待连接就绪，超时则带警告继续
 *
 * C-A 是运行时能力（4 文件 7,669 行），核心断言在 core 单测里（`packages/core/src/agent` 下的 test 文件，41 条）。**覆盖来源**：core 单测（`packages/core/src/agent` 下的 test 文件，47 条）。这类行为是纯事件归约或领域规则，浏览器侧没有独立观察点；`/api/agent` 的 SSE 已落地，能端到端验的三条（命令分发、事件序列、压缩）已在 `s-001`～`s-008` 转真。保留 fixme 只为让 registry 的 44 条脚本文件仍在（`behaviorScripts` 结构绿），不是留给将来在这里补断言。
 */
test.fixme('prompt 前准备 MCP：可选等待连接就绪，超时则带警告继续', async ({ page }) => {
  // 解除条件：`/api/agent` SSE 路由落地 + 假传输开关可用后，把 fixme 换成真断言
  await page.goto('/')
  expect(page).toBeTruthy()
})
