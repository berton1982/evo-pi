<!-- TODO-init-scaffold（由 state.mjs init 从 references/templates/stubs.md 铺底）
     1. 逐节把占位符换成真实内容（不要留 <...>）
     2. 填完后删掉这段注释——留着的 TODO 就是没做完
-->

# 桩清单 — `<program>/contracts/stubs.md`

> P1 门 `stubPlan` 检查：契约（`contracts/wire.md` 的命令表 + 事件表）里的**每一条**都必须在这里有一行；`状态` 只能是 `ready` 或 `blocked`（`blocked` 必须写 ≥10 字理由）；`ready` 的 `桩实现`/`夹具` 路径必须真实存在。
> C5 门 `stub` 再按"本能力表面点用到的命令"复查一遍——只挡本能力，不让别的能力的桩延期拖住你。
>
> **为什么桩必须配夹具**：桩返回 `{}` 也能让前端不崩，但一联调全错。夹具是"桩返回什么"的唯一证据，形状必须来自 `contracts/data-format.md` 与 `schema.ts`，不许现编。

## 1. 桩清单

| 命令/事件 | 桩实现 | 夹具 | 状态 | 理由（blocked 必填） |
| --- | --- | --- | --- | --- |
| `GET /api/example` | `apps/web/shared/stubs/example.ts` | `fixtures/example-list.json` | ready | — |
| `POST /api/example` | `apps/web/shared/stubs/example-create.ts` | `fixtures/example-created.json` | blocked | 依赖建表迁移未合并，预计随 T-12 解除 |

## 2. 桩的纪律（三条）

1. **桩是契约的实现，不是 mock 框架的发挥**：入参/出参必须与 `schema.ts` 一致，字段不许增减。
2. **桩不许有业务分支**：需要"成功/失败"两种返回时，用 query 参数或独立夹具，不在桩里 if 业务条件。
3. **桩的生命周期终点是联调**：`integration.md` 里每条命令都要写清换成哪个真实现；桩一直绿而真实现没跑过，等于没做联调。

## 3. 前后端独立开发的分工

| 线 | 拿到什么就能开工 | 完成判据 |
| --- | --- | --- |
| 前端（FE-slice） | 契约 + 桩 + 夹具 | 组件测试与行为脚本对桩全绿 |
| 后端（BE-slice） | 契约 + `schema.ts` + 夹具（作为测试输入） | 真实现通过同一批夹具的契约测 |

两边都以**夹具**为准，不以对方的实现为准——这是"独立开发能集成"的唯一保证。
