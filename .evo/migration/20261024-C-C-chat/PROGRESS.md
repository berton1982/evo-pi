# 迁移进展 — .evo/migration/20261024-C-C-chat

> 由 `state.mjs status` 自动生成。**不要手改**：手改 = 下一个 session 读到的是假进展。
> 生成时间：2026-10-25T09:02:12.110Z
> 作用域：**capability** · R 级 **R3** · 纲领 `.evo/migration/20261022-mig`

## 1. 现在在哪

- 阶段：**C6 行为对账**（in_progress）
- 阶段目标：同一脚本：30141 采集 / 30041 断言；差异逐条分类，未分类 = 0
- 当前子步骤：**c6.1** 跑全量行为脚本（capture → assert）
- 下一动作：按子步骤执行，完成后 `state.mjs step --id c6.1`

## 2. 阶段阶梯

| 阶段 | 状态 | 产出 |
|---|---|---|
| C0 立项 | done | CHARTER.md |
| C1 结构对账与表面枚举 | done | evidence/symbols-*.md / symbol-map.md / ownership.md / cut-list.md / surface.json |
| C2 契约对齐 | done | contract-delta.md |
| C3 行为规格 | done | spec.md / behaviors.md / specs/*.md（仅 R3） / harness/registry.json |
| C4 能力设计 | done | design/manifest.json / design/components.md（UML 静态视图：组件/hook/store 与依赖订阅） / design/dynamics.md（动态视图：序列图 + 状态流图） / design/quality.md（预算 + 测试策略） / design/ui.md（ASCII 原型：主屏 + 空态 + 交互态，必须人工审核） / design/interfaces.ts（类型骨架，被 components.md 引用） / design/sequences/*.md（R3 单列长链路） / plans/*.md（R2/R3） |
| C5 实现 | done | 代码 / gates/C5.json（机器证据） / review.md（R2/R3） |
| C6 行为对账 | **in_progress** | parity.md |
| C7 收割回灌 | pending | retro.md / acceptance.md（L6 人工验收已签） / GODS.md / CAPABILITIES.md 状态更新 |

## 3. 本阶段子步骤

- [ ] c6.1 跑全量行为脚本（capture → assert）
- [ ] c6.2 三维 diff：wire 调用 / DOM+a11y / 截图
- [ ] c6.3 逐条分类：可接受 / 缺陷 / 有意偏离（附理由）
- [ ] c6.4 R3 另测渲染预算：会话切换与流式更新

## 4. 输入与产出

- 输入：behaviors.md / harness/ / design/quality.md
- 产出：parity.md
- 已登记产物：（无）
- 指纹：ChatWindow.tsx 2282 行 sha1 8f44388 · 1139 声明(LSP)；MessageView.tsx 2161 行 sha1 075a192 · 1126 声明(LSP)
- 表面点：0

## 5. 漂移与风险

- 无

## 5.5 任务台账

- T-01: **done**（2026-10-24T06:11:23.715Z）
- T-02: **done**（2026-10-24T06:11:23.785Z）
- T-03: **done**（2026-10-24T06:11:23.856Z）
- T-04: **done**（2026-10-24T06:11:23.928Z）

## 6. 待决项

- 无

## 7. 签字

- spec.md · berton · 2026-10-24T03:26:42.220Z
- design/manifest.json · berton · 2026-10-25T04:52:30.651Z
- design/components.md · berton · 2026-10-24T06:03:17.436Z
- design/ui.md · berton · 2026-10-24T06:03:34.871Z
- parity.md · berton · 2026-10-25T08:51:04.686Z

## 8. 上次命令

- 无

## 9. 新 session 开场（3 分钟）

1. 读本文件第 1、5、6 节（在哪 / 有什么风险 / 有什么待决）
2. 只读当前阶段那一节：`references/workflow.md#c6`
3. 不重读已 done 阶段的产出，除非第 5 节报了漂移
4. 下一步就是第 1 节里的「下一动作」
