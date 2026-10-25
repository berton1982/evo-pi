'use client'
// 客户端组件/钩子：这里用 state、effect、事件处理器。显式声明比靠父层推导安全——
// 一旦有人把它 import 进服务端组件，Next 会在构建期报错，而不是运行时才炸。
/**
 * @design D-U-07
 * @design C-05
 *
 * 测试结果行（presenter）。
 *
 * 三态必须区分「跑着」「通过」「超时」——超时和失败的处理完全不同：
 * 超时提示"再点一次"，被拒绝要提示改配置。pi-web 把这些挤在一个 `status` 字符串里（`McpConfig.tsx:1767`）。
 */

import type { McpTestResult } from '@evo-pi/core/mcp'
import { failureText, type Translate } from '@evo-pi/core/mcp'

export interface McpTestStatusProps {
  result?: McpTestResult
  running: boolean
  t: Translate
}

// @design D-U-08 —— 测试三态与状态行由本组件承担
// @design C-05
export function McpTestStatus({ result, running, t }: McpTestStatusProps) {
  if (running) {
    return (
      <p role="status" data-testid="mcp-test-running">
        {t('mcp.test.running')}
      </p>
    )
  }
  if (!result) return null
  if (result.ok) {
    return (
      <p role="status" data-testid="mcp-test-ok">
        {t('mcp.test.ok', { count: result.tools?.length ?? 0 })}
      </p>
    )
  }
  return (
    <p role="alert" data-testid="mcp-test-fail">
      {failureText(result.error ?? { code: 'internal' }, t)}
    </p>
  )
}
