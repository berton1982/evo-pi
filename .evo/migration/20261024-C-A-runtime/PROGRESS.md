# 迁移进展 — .evo/migration/20261024-C-A-runtime

> 由 `state.mjs status` 自动生成。**不要手改**：手改 = 下一个 session 读到的是假进展。
> 生成时间：2026-10-25T03:47:18.664Z
> 作用域：**capability** · R 级 **R3** · 纲领 `.evo/migration/20261022-mig`

## 1. 现在在哪

- 阶段：**C7 收割回灌**（in_progress）
- 阶段目标：教训变成规则/契约/技能，而不是留在对话里
- 当前子步骤：**c7.1** 复盘：哪些设计判断错了、哪些门太松/太紧
- 下一动作：按子步骤执行，完成后 `state.mjs step --id c7.1`

## 2. 阶段阶梯

| 阶段 | 状态 | 产出 |
|---|---|---|
| C0 立项 | done | CHARTER.md |
| C1 结构对账与表面枚举 | done | evidence/symbols-*.md / symbol-map.md / ownership.md / cut-list.md / surface.json |
| C2 契约对齐 | done | contract-delta.md |
| C3 行为规格 | done | spec.md / behaviors.md / specs/*.md（仅 R3） / harness/registry.json |
| C4 能力设计 | done | design/manifest.json / design/components.md（UML 静态视图：组件/hook/store 与依赖订阅） / design/dynamics.md（动态视图：序列图 + 状态流图） / design/quality.md（预算 + 测试策略） / design/ui.md（ASCII 原型：主屏 + 空态 + 交互态，必须人工审核） / design/interfaces.ts（类型骨架，被 components.md 引用） / design/sequences/*.md（R3 单列长链路） / plans/*.md（R2/R3） |
| C5 实现 | done | 代码 / gates/C5.json（机器证据） / review.md（R2/R3） |
| C6 行为对账 | done | parity.md |
| C7 收割回灌 | **in_progress** | retro.md / acceptance.md（L6 人工验收已签） / GODS.md / CAPABILITIES.md 状态更新 |

## 3. 本阶段子步骤

- [ ] c7.1 复盘：哪些设计判断错了、哪些门太松/太紧
- [ ] c7.2 每条教训指定落地位置（规则文件 / 契约变更 / issue）
- [ ] c7.3 跨能力问题提到 Program（待决项）
- [ ] c7.4 回写 GODS.md 与 CAPABILITIES.md 状态
- [ ] c7.5 L6 人工验收：acceptance.md 的 L6 行写签字人与结论（agent 不得代签）

## 4. 输入与产出

- 输入：本能力全部产出
- 产出：retro.md / acceptance.md（L6 人工验收已签） / GODS.md / CAPABILITIES.md 状态更新
- 已登记产物：（无）
- 指纹：useAgentSession.ts 2805 行 sha1 2356070 · 1367 声明(LSP)；rpc-manager.ts 2757 行 sha1 47f4516 · 1030 声明(LSP)；mcp-host.ts 1105 行 sha1 8b85f11 · 430 声明(LSP)；subagents.ts 1002 行 sha1 f81569c · 527 声明(LSP)
- 表面点：0

## 5. 漂移与风险

- ⚠ 全景表在立项后改动过 → C1/切片结论需复核

## 5.5 任务台账

- 无（C5 前为空；C5 起每个 T-xx 一条）

## 6. 待决项

- 无

## 7. 签字

- spec.md · berton · 2026-10-24T01:22:10.430Z
- design/manifest.json · berton · 2026-10-25T03:33:51.227Z
- design/components.md · berton · 2026-10-25T03:34:09.757Z
- design/ui.md · berton · 2026-10-25T03:34:32.046Z
- parity.md · berton · 2026-10-25T03:44:52.913Z

## 8. 上次命令

- 无

## 9. 新 session 开场（3 分钟）

1. 读本文件第 1、5、6 节（在哪 / 有什么风险 / 有什么待决）
2. 只读当前阶段那一节：`references/workflow.md#c7`
3. 不重读已 done 阶段的产出，除非第 5 节报了漂移
4. 下一步就是第 1 节里的「下一动作」
