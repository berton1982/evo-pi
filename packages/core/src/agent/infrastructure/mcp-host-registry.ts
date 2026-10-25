/**
 * @design D-M-03 HostInstance（按 cwd 缓存 host）
 *
 * 为什么按 cwd 缓存：同一个 cwd 的 MCP 配置是一样的，重复起子进程既慢又会撞端口；
 * 但换 cwd 必须换 host——项目级 `.pi/mcp.json` 只对那个项目生效。
 */
import type { McpRuntime } from '../domain/ports/mcp-runtime'

export interface HostInstance {
  cwd: string
  runtime: McpRuntime
}

export function createHostRegistry(create: (cwd: string) => McpRuntime): {
  get: (cwd: string) => HostInstance
  dispose: (cwd: string) => void
  size: () => number
} {
  const hosts = new Map<string, HostInstance>()
  return {
    get: (cwd) => {
      const existing = hosts.get(cwd)
      if (existing) return existing
      const instance = { cwd, runtime: create(cwd) }
      hosts.set(cwd, instance)
      return instance
    },
    dispose: (cwd) => {
      hosts.delete(cwd)
    },
    size: () => hosts.size,
  }
}
