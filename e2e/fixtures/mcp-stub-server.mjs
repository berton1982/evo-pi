/**
 * e2e 用的最小 stdio MCP 服务端：只实现 initialize + tools/list。
 *
 * 为什么需要一个真进程：`POST /api/mcp/test` 的判据是"起进程 → 握手 → 列工具"，
 * 用假进程测不到 `command` 写错、握手超时这类真实失败。
 */
let buf = ''
process.stdin.on('data', (chunk) => {
  buf += chunk
  for (const line of buf.split('\n')) {
    if (!line.trim()) continue
    let msg
    try {
      msg = JSON.parse(line)
    } catch {
      continue
    }
    if (msg.method === 'initialize') {
      process.stdout.write(
        `${JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: { protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'stub', version: '0.0.0' } } })}\n`,
      )
    }
    if (msg.method === 'tools/list') {
      process.stdout.write(
        // 必须带 inputSchema：pi-web 的 tools/list 校验会拒绝缺字段的条目
        // （对照测试里 pi-web 对缺 inputSchema 的条目回 "Invalid entry in MCP tools/list result"）。
        `${JSON.stringify({
          jsonrpc: '2.0',
          id: msg.id,
          result: {
            tools: [
              { name: 'echo', inputSchema: { type: 'object' } },
              { name: 'ping', inputSchema: { type: 'object' } },
            ],
          },
        })}\n`,
      )
    }
  }
  buf = buf.slice(buf.lastIndexOf('\n') + 1)
})
