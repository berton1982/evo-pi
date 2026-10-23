'use client'

/**
 * MCP 能力向设置弹窗暴露的分区声明。
 *
 * 这是 features/mcp 对外唯一的"装配出口"：壳拿到的只是 spec，
 * 不知道 MCP 内部怎么实现（也不允许 import 内部模块）。
 */

import { defineSettingsPanel } from '@/shell/registry/panels'
import { McpSettingsClient } from './mcp-settings-client'

export const mcpSettingsPanel = defineSettingsPanel({
  id: 'mcp',
  // 这个分区在 pi-web 里叫 "MCP"，没有经过 i18n 键，保持一致避免多一套命名
  label: 'MCP',
  order: 40,
  // 壳只传 cwd/sessionId；首屏数据由组件自己取（弹窗内不适合再走服务端读盘）
  Component: ({ cwd }) => <McpSettingsClient cwd={cwd} initialServers={null} initialError={null} />,
})
