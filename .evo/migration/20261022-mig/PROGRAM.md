# 迁移纲领 — pi-web → evo-pi（20261022-mig）

> 本文件由 `state.mjs init --scope program` 铺底到 `.evo/migration/<run>/PROGRAM.md`，就地填写（删掉顶部 TODO 横幅）。
> P0 门检查前三节存在且整篇 ≥400 字；横幅不删即判红。

## 1. 成功定义

把 `ref_projects/pi-web` 的 **18 个 god 文件（32,533 行）** 迁入 evo-pi 的既有分层（`packages/core` 四层 + `packages/web` 三区 + 16 个 shadcn 原语 + 5 个 zustand store），满足以下五条才叫"迁完"：

1. **行级闭合**：每个 god 的每一次行归属都在 `ownership.md` 里，`1..N` 无缝、无重叠，归属是设计元素 ID；`drop` 必须有同范围砍单条目且写清影响。
2. **符号闭合**：god 的声明全集（tsserver 采集，`*.meta.json` 可核）与 evo-pi 落点一一对账，无"隐性设计"。
3. **行为闭合**：god 的交互面（handler / aria / role / command / event / url / hotkey / api / i18n）全部有行为 ID 与可执行脚本，零孤儿。
4. **契约闭合**：wire（命令/事件）与 DTO 契约在 P1 冻结，任何偏离走 `CHG-` 变更单；源码与契约可机器对账。
5. **单源运行**：evo-pi 只读 `PI_CODING_AGENT_DIR` 一处数据源，pi-web 与 evo-pi 不各存一份会话数据；割接后 30141 的既有数据可冷启动读取。

**反面判据**（出现任一即不算成功）：靠报告文字宣称"已迁完"；用 `@ts-ignore`/`any` 抹平对账；测试为了迁就实现而改判据；同一份数据两处写。

## 2. 不做清单

1. **不改 pi-web**：它是只读参照（`ref_projects/` 被 gitignore）。迁移期间不向 30141 写数据、不模拟它的 CLI 内部行为。
2. **不迁 demo 副本**：`ref_projects/pi-web/demo/**` 是演示代码，不进入任何能力。
3. **不重写产品决策**：交互、文案、默认值以 pi-web 为准；有异议记 `design/patterns.md` 的"被否方案"，不在迁移中悄悄改。
4. **不新增框架**：前端仍 React + zustand + shadcn；后端仍 Clean Architecture 四层。新依赖须先写 ADR。
5. **不并行多个 R3**：R3 中枢同一时间只允许一个在 C5，避免跨域状态编排互相踩。

## 3. 容量假设

| R 级 | god | 单个预估 | 说明 |
|---|---|---|---|
| R3 中枢 | 4（useAgentSession / rpc-manager / AppShell / ChatWindow） | 4–6 天 | 全 8 阶段 + 决策表 + 时序图 + 双重签字 + 渲染预算 |
| R2 复杂界面 | 9 | 2–3 天 | C1–C6，免序图，设计需批注 |
| R1 独立模块/设置 | 5 | 0.5–1 天 | C0/C1/C3/C5/C6/C7，免设计签字、免决策表 |

单能力串行。按 R1 → R2 → R3 递进：先用 5 个 R1 把工具链跑顺（每轮 0.5–1 天），再进 R2，最后 R3；**不跳级**。全量串行窗口 2–3 周。

前置成本（只付一次）：program run 的 P0–P4（纲领 / 六份契约 / 骨架 / 架构 / 能力切片 / 割接预案）+ chassis 的 H0 底盘契约。
