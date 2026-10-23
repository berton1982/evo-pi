/**
 * MCP 能力的**服务端入口**（只在 node 里用，别被客户端组件 import）。
 *
 * 为什么要把 infrastructure 拆出来单开一个入口（2026-10-23，`next build` 抓到的真事故）：
 * 一开始 `@evo-pi/core/mcp` 是一个 barrel，把 adapters（fetch）和 infrastructure（`node:fs`）
 * 一起导出。客户端岛从同一个 barrel 取 adapters，Turbopack 顺着 barrel 把 `node:fs` 拖进
 * 浏览器 chunk，构建直接失败：`the chunking context does not support external modules (request: node:fs)`。
 *
 * 结论：**barrel 的边界就是运行时的边界**。浏览器能碰的（domain / use-cases / adapters）
 * 留在 `./mcp`；碰磁盘的（infrastructure）单独走 `./mcp/server`。
 */

export * from './domain/mcp-types'
// 服务端也要类型与用例（route handler 一次 import 就够）
export * from './domain/ports'
export type { McpEntry, StdioTestResult } from './infrastructure/mcp-config'
export {
  addServer,
  agentDir,
  ensureDir,
  findEntry,
  globalConfigPath,
  listServers,
  projectConfigPath,
  removeServer,
  setEnabled,
  testStdio,
} from './infrastructure/mcp-config'
export * from './use-cases'
