# 联调记录 — `<capability>/integration.md`

> C5 门 `integration` 检查：`surface.json` 里每个 `api` 点（`METHOD /path`）在此表有一行；`真实现` 不能为空/不能写"桩"、路径必须存在；`联调证据` 必须是 `T-xx`、`gates/<id>.json` 或 `e2e/...`。
>
> **为什么这一门必要**：桩绿 + 组件绿 + 后端单测绿，系统仍然可能不通。这门是"桩已被真实现替换过"的唯一证据，也是把"前后端独立开发"闭合的那一步。

## 1. 替换表

| 命令 | 桩 | 真实现 | 联调证据 |
| --- | --- | --- | --- |
| `GET /api/example` | `apps/web/shared/stubs/example.ts` | `packages/core/src/example/adapters/http-example-repository.ts` | T-14 |
| `PATCH /api/example` | `apps/web/shared/stubs/example-patch.ts` | `packages/core/src/example/adapters/http-example-toggler.ts` | gates/C5.json |

## 2. 联调中发现的问题

| 现象 | 根因 | 处置 | 是否回写契约 |
| --- | --- | --- | --- |
| 列表少一个字段 | 桩按旧 schema 造的数据 | 更新夹具 + 补 CHG-00x | 是（CHG-002） |

规矩：联调时发现的**契约问题**必须走 CHG 单（`contract-delta.md`），不许直接改两边的代码让它对上——那样下一次独立开发还会错。

## 3. 未联调的部分

| 命令/路径 | 为什么不联调 | 谁在什么时候补 |
| --- | --- | --- |
| — | — | — |

规矩：`—` 也要写。空白表格无法区分"没有"与"忘了写"。
