/**
 * @design D-M-04 McpHostOptions / McpHost
 *
 * 选项与实现分开：测试要注入"假的 server 启动器"，生产给真的；
 * 把启动逻辑写死在 host 里就只能靠环境变量开关，那是把测试泄漏进产品。
 */
import type { McpRuntime } from '../domain/ports/mcp-runtime'
import { createMcpHost, type McpServerStart } from './mcp-host'

export interface McpHostOptions {
  /** 每个 server 的启动器；不传就是空集合（等于"没有任何 MCP 能力"）。 */
  servers?: McpServerStart[]
  timeoutMs?: number
  /** 允许整体关掉（某些部署环境没有子进程能力）。 */
  enabled?: boolean
}

export function createMcpHostFrom(options: McpHostOptions = {}): McpRuntime {
  const host = createMcpHost({
    // enabled=false 时不启动任何 server：与"启动了但全失败"是不同语义，
    // 前者是配置选择，后者要上报 degraded
    servers: options.enabled === false ? [] : (options.servers ?? []),
    timeoutMs: options.timeoutMs ?? 8000,
  })
  return {
    prepare: () => host.prepare(),
    // 这一层不做连接监视：watch 需要常驻进程，属 C-G 的 host 侧；
    // 这里返回一个空订阅，明确"没有监视"而不是假装有
    watch: () => () => {},
  }
}
