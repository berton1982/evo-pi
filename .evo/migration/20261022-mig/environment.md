# 环境矩阵 — pi-web → evo-pi

> 这一页只写"怎么跑"。C-G 试点里三件事各吃掉一段时间：`tsserver.js` 不存在、`next dev` 让页面永远空、
> `PI_CODING_AGENT_DIR` 差点写进真实 `~/.pi/agent`——全是环境问题，不是代码问题。

## 1. 端口与进程

| 项 | 值 | 说明 |
| --- | --- | --- |
| pi-web 参照站 | `30141` | 只读参照，本仓任何端口都不占用它 |
| evo-pi 验收入口 | `30041` | 生产构建 `next start`，不用 dev |
| 启动 | `cd packages/web && PI_CODING_AGENT_DIR=/tmp/e2e-agent npx next start -p 30041` | dev 模式下 StrictMode 会反复挂载 effect，首屏可能永远空 |
| 停服务 | `fuser -k 30041/tcp` | 收尾必做，避免下一轮误连旧实例 |

## 2. 环境变量

| 项 | 值 | 说明 |
| --- | --- | --- |
| `PI_CODING_AGENT_DIR` | `/tmp/e2e-agent` | 必须隔离；不设会写用户真实 `~/.pi/agent` |
| 夹具项目目录 | `/tmp/e2e-proj` | 项目级配置在 `<proj>/.pi/mcp.json` |
| Playwright 浏览器 | chromium | 首次 `npx playwright install chromium` |

## 3. 构建与运行

| 项 | 值 | 说明 |
| --- | --- | --- |
| core 构建 | `npx tsc -p packages/core` | web 通过 `@evo-pi/core/mcp` 取类型 |
| web 构建 | `cd packages/web && npx next build` | 只认生产构建 |
| 逻辑测试 | `npx vitest run <path>` | 不用 watch |
| e2e | `npx playwright test e2e/mcp --workers=1` | 夹具是共享 tmp 文件，必须串行 |

## 4. 工具链版本

| 项 | 值 | 说明 |
| --- | --- | --- |
| Node | 24.x | 与 engines 一致 |
| TypeScript | 5.9.3（全局） | 7.x 原生发行版没有 `tsserver.js`，LSP 会整体失联 |
| tsserver | `.pi/supi/config.json` 指向全局 `tsserver.js` | 符号分母必须由它采集，手填不认 |

## 5. 夹具与隔离

| 项 | 值 | 说明 |
| --- | --- | --- |
| 用户级配置 | `/tmp/e2e-agent/mcp.json` | 每例复位（`resetMcpFixture()`） |
| 项目级配置 | `/tmp/e2e-proj/.pi/mcp.json` | 同上 |
| stdio MCP 替身 | `e2e/fixtures/mcp-stub-server.mjs` | 真子进程、真 `initialize` + `tools/list` |
| 红线 | 不写 `~/.pi/agent` | 任何用例把它当默认值即判失败 |
