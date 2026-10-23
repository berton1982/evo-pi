/**
 * C-G（MCP 设置）能力的**浏览器安全入口**。
 *
 * 与 `session` 一致：domain / use-cases / adapters 都在 core，web 只做组合根与渲染。
 * 这里**不导出** infrastructure（`node:fs`）——需要读写磁盘的服务端代码走 `@evo-pi/core/mcp/server`。
 * 教训见 `server.ts` 顶部：barrel 的边界就是运行时的边界，混在一起 `next build` 会当场炸。
 */
export * from './adapters'
export * from './domain/mcp-labels'
export * from './domain/mcp-types'
export * from './domain/ports'
export * from './use-cases'
