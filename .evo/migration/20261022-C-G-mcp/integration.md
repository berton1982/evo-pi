# 联调记录 — C-G（MCP 设置）

> C5 门 `integration` 检查：`surface.json` 里每个 `api` 点在此表有一行；`真实现` 不能为空/不能写"桩"、路径必须存在；`联调证据` 必须是 `T-xx`、`gates/<id>.json` 或 `e2e/...`。
>
> **本能力的实际情况**：`McpConfig.tsx` 自己一处 `fetch` 都没有，HTTP 全在 `components/mcp-config-helpers.ts` 等三个兄弟模块里（C2 的 `externalIo` 门追出来的 5 条命令）。因此 `surface.json` 的 `api` 点为 0，`stub` 门报"本能力没有 HTTP 表面点（无桩需求）"。
> 下面这张表记的是**这 5 条命令的真实现要落在哪**——它是 C5 后续适配器任务的开工依据，不是已完成项。

## 1. 替换表

| 命令 | 桩 | 真实现 | 联调证据 |
| --- | --- | --- | --- |
| `GET /api/mcp` | `packages/core/src/mcp/adapters/mcp-repository-double.ts`（内存桩，返回夹具 `fixtures/mcp-overview.json`） | `packages/core/src/mcp/adapters/http-mcp-repository.ts` | T-05 |
| `POST /api/mcp` | 同上 | 同上（`add` / `remove` 共用端点） | T-13 |
| `PUT /api/tools/settings` | `packages/core/src/mcp/adapters/tools-settings-double.ts` | `packages/core/src/mcp/adapters/http-tools-settings.ts` | T-21 |
| `POST /api/mcp/test` | `packages/core/src/mcp/adapters/mcp-test-runner-double.ts` | `packages/core/src/mcp/adapters/http-mcp-test-runner.ts` | gates/C5.json |
| `POST /api/mcp/sign-in`（含 `[flowId]` 三条） | `packages/core/src/mcp/adapters/mcp-sign-in-double.ts` | `packages/core/src/mcp/adapters/http-mcp-sign-in.ts` | T-20 |

## 2. 联调中发现的问题

| 现象 | 根因 | 处置 | 是否回写契约 |
| --- | --- | --- | --- |
| 组件里读不到错误码分类 | `McpError.message` 当初被写成必填，而端口层常常只有码 | 改为可选，分类文案统一走 `failureText` | 否（内部类型，非 wire 契约） |
| 批量结果按下标对齐会错位 | 假设"成功的排在前"，成功/失败交错时把失败项算成成功 | 改为从 `batchSummary` 的失败集合反推 `changed` | 否 |

规矩：联调时发现的**契约问题**必须走 CHG 单（`contract-delta.md`），不许直接改两边的代码让它对上——那样下一次独立开发还会错。

## 3. 未联调的部分

| 命令/路径 | 为什么不联调 | 谁在什么时候补 |
| --- | --- | --- |
| 上表 5 条命令的**真服务端**联调 | 适配器已实现并通过注入式单元测试（`adapters.test.ts`，8 条），但尚未对真实 `/api/mcp` 打请求——那需要 pi-web 侧的会话与项目信任态 | C6 harness capture 阶段，用 30041 端口跑一次真请求并落 `gates/C6.json` |
| `GET /api/mcp/sign-in/[flowId]` 轮询的真实超时行为 | 需要真实服务端流程（浏览器里完成 OAuth），Playwright 尚未接入 | C6 的 harness capture 阶段 |
