<!-- TODO-init-scaffold（由 state.mjs init 从 references/templates/environment.md 铺底）
     1. 逐节把占位符换成真实内容（不要留 <...>）
     2. 填完后删掉这段注释——留着的 TODO 就是没做完
-->

# 环境矩阵 — `environment.md`

<!-- TODO-init-scaffold：由 state.mjs init 从 references/templates/environment.md 铺底，填完删除本行。
     门判据见 scripts/lib/envdoc.mjs：五节齐备、关键条目在册、有「项/值/说明」表。 -->

> 这一页回答"换台机器、换个人，怎么把它跑起来"。
> C-G 试点里，端口不会开、变量没隔离、`tsserver.js` 不存在，三件事各吃掉一段排查时间，
> 而且没有一件是代码问题——所以把它变成 P1 的产物，写不全就不许进骨架阶段。

## 1. 端口与进程

| 项 | 值 | 说明 |
| --- | --- | --- |
| pi-web 参照站 | `30141` | 只读参照；本仓任何端口都不许占用它 |
| evo-pi 验收入口 | `30041` | 生产构建 `next start`，不用 dev |
| 验收入口启动 | `cd packages/web && PI_CODING_AGENT_DIR=<临时目录> npx next start -p 30041` | dev 模式下 effect 会被 StrictMode 反复挂载，页面可能永远空 |
| 服务停掉 | `fuser -k 30041/tcp` | 收尾必做，避免下一轮误连旧实例 |

## 2. 环境变量

| 项 | 值 | 说明 |
| --- | --- | --- |
| `PI_CODING_AGENT_DIR` | 临时目录（如 `/tmp/e2e-agent`） | 必须隔离，否则直接写用户真实 `~/.pi/agent` |
| 夹具项目目录 | `/tmp/e2e-proj` | 项目级配置放在 `<proj>/.pi/mcp.json` |
| 浏览器通道 | chromium（`npx playwright install chromium`） | 首次约 120MB |

## 3. 构建与运行

| 项 | 值 | 说明 |
| --- | --- | --- |
| core 构建 | `npx tsc -p packages/core` | web 走 `@evo-pi/core/mcp` 的类型产物 |
| web 构建 | `cd packages/web && npx next build` | 只认生产构建 |
| 启动 | `next start -p 30041` | 端口固定，e2e 的 baseURL 依赖它 |
| 逻辑测试 | `npx vitest run <path>` | 不用 watch |

## 4. 工具链版本

| 项 | 值 | 说明 |
| --- | --- | --- |
| Node | 24.x | 与 `package.json` engines 一致 |
| TypeScript | **5.9.x**（全局） | 7.x 原生发行版没有 `tsserver.js`，LSP 会整体失联 |
| tsserver | `.pi/supi/config.json` 指向全局 `tsserver.js` | 符号分母必须来自它，手填不认 |
| Playwright | 与仓库版本一致 | `--workers=1`，夹具是共享 tmp 文件 |

## 5. 夹具与隔离

| 项 | 值 | 说明 |
| --- | --- | --- |
| 用户级配置 | `/tmp/e2e-agent/mcp.json` | 每个用例前复位（`resetMcpFixture()`） |
| 项目级配置 | `/tmp/e2e-proj/.pi/mcp.json` | 同上 |
| stdio MCP 替身 | `e2e/fixtures/mcp-stub-server.mjs` | 真子进程、真 `initialize` + `tools/list` |
| 隔离红线 | 绝不写 `~/.pi/agent` | 任何用例把它当默认值时直接判失败 |
