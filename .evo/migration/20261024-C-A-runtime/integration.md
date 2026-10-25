# 联调 — `20261024-C-A-runtime/integration.md`

> C5 门 `integration` 检查：本能力用到的每条 HTTP 命令都要有「真实现」（真实文件路径，不能写桩）+「联调证据」（`T-xx` / `gates/*.json` / e2e 脚本）。
> 本能力的特殊之处：它是**运行时**，桩是"假传输"（`testing/fake-transport.ts`）——按契约产生 `start/delta/end` 事件，消费方真跑；真实现是各用例与适配器。

## 替换表

| 命令 | 桩 | 真实现 | 联调证据 |
|---|---|---|---|
| `GET /api/agent/[id]` | `packages/core/src/agent/testing/fake-transport.ts` | `packages/core/src/agent/use-cases/session-data.ts` | `T-01` |
| `GET /api/sessions/[id]` | `packages/core/src/agent/testing/fake-transport.ts` | `packages/core/src/agent/use-cases/session-data.ts` | `T-05` |
| `GET /api/sessions/[id]/state` | `packages/core/src/agent/testing/fake-transport.ts` | `packages/core/src/agent/use-cases/session-data.ts` | `T-06` |
| `POST /api/agent/[id]/lease` | `packages/core/src/agent/testing/fake-transport.ts` | `packages/core/src/agent/use-cases/agent-session.ts` | `T-02` |
| `POST /api/agent/new` | `packages/core/src/agent/testing/fake-transport.ts` | `packages/core/src/agent/use-cases/new-session.ts` | `T-04` |
| `PUT /api/models/default` | `packages/core/src/agent/testing/fake-transport.ts` | `packages/core/src/agent/use-cases/initial-choices.ts` | `T-04` |

说明：HTTP/SSE 的接线路由 `/api/agent` 属 H2（应用框架），本能力只提供被它调用的用例与适配器；因此"真实现"列写的是**能力侧真实落点**，不是路由文件。

## 联调问题

| 问题 | 现象 | 处理 | 是否回写契约 |
|---|---|---|---|
| 传输通道未接 | 没有 `/api/agent` 路由，e2e 44 条只能是 fixme | 先做假传输（`testing/fake-transport.ts`）让用例真跑，路由落地后再换 | 否（契约 `P-A-01` 早就定了 shape） |
| 契约缺 rpc 层 | `check-contracts` 报 46 个命令"不在契约里" | wire.md 升 v0.3 补「RPC 命令」表 67 行（CHG-005） | 是（CHG-005） |
| `GET /api/sessions/[id]/state` 桩口径 | program 的 stubs.md 里它是 blocked（等 C-E） | 本能力不消费该 HTTP 端点，改用 `P-A-02` 端口；stubs 中标 ready 指向假传输 | 否 |

## 未联调部分

| 命令 | 为什么没联调 | 解除条件 |
|---|---|---|
| 全部 6 条 | `/api/agent` SSE 路由属 H2，尚未实现；本能力用假传输 + 端口在 core 内证完 | H2 落地后把 `testing/fake-transport.ts` 换成真实适配器，44 条 e2e 从 fixme 转真断言 |
