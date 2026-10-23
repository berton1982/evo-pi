# 验收阶梯 — `<capability>/acceptance.md`

> C6 门 `acceptance`（mode=`pre`）：L1–L4 必须有且结果 `pass`（或 `skipped` + ≥10 字豁免理由）；本能力有 HTTP 表面点时 L5 也必须有。L6 在 C6 可为 `pending`。
> C7 门 `acceptance`（mode=`final`）：六层齐全，L6 必须 `pass` 且 `签字` 是**人**（写 agent/assistant/bot 直接判红——人工验收不可代签）。
>
> 六层是六个**不同的分母**：每条规则、每个接缝、每个交互、每条行为、每个端点、最终用户。少一层就会出现"某一类错误没有任何一层能抓到"。

## 1. 阶梯

| 层 | 命令 | 结果 | 证据 | 签字 |
| --- | --- | --- | --- | --- |
| L1 算法规格 | `pnpm --filter @evo/core test -- example` | pass | T-03 | — |
| L2 架构契约 | `pnpm --filter @evo/core test -- architecture` | pass | T-09 | — |
| L3 组件/交互 | `pnpm --filter @evo/web test -- example-panel` | pass | e2e/example/panel.spec.ts | — |
| L4 行为对账 | `node .pi/skills/migrating-god-files/scripts/check-phase.mjs --run <dir> --phase C6` | pass | gates/C6.json | — |
| L5 联调 | `pnpm e2e -- example` | pass | gates/C5.json | — |
| L6 人工验收 | 用户按 `behaviors.md` 逐条点 | pending | manual:example-acceptance | — |

## 2. 每层在挡什么

| 层 | 挡的错误 | 抓不到时会发生什么 |
| --- | --- | --- |
| L1 | 算法/决策表实现错 | 页面对、行为错（最难发现） |
| L2 | 层间接缝错（usecase 绕过 port） | 换适配器时整片崩 |
| L3 | 三态与交互缺失 | 空列表白屏、错误没有出口 |
| L4 | 与 pi-web 行为漂移 | "看起来一样，用起来不一样" |
| L5 | 桩与真实现不一致 | 桩全绿、上线不通 |
| L6 | 观感与手感 | 全部自动门绿，用户说"不好用" |

## 3. 豁免与回归

- `skipped` 必须写"为什么这一层对本能力无意义"（例：纯算法能力没有 HTTP 表面点 → L5 可 skipped）。
- 任何一个 `fail` 都不许用"下个迭代修"结案：要么修，要么把该行为从 `behaviors.md` 移出并写进 `cut-list.md`（带影响）。
- 收割前（C7）重跑 L1–L5 并把结果刷新到本表——表格里的证据不许超过 7 天。
