# 迁移进展 — .evo/migration/20261022-C-H-skills

> 由 `state.mjs status` 自动生成。**不要手改**：手改 = 下一个 session 读到的是假进展。
> 生成时间：2026-10-22T03:30:05.447Z
> 作用域：**capability** · R 级 **R1** · 纲领 `.evo/migration/20261022-mig`

## 1. 现在在哪

- 阶段：**C2 契约对齐**（in_progress）
- 阶段目标：本能力用到的命令/事件/URL/i18n/token 都在冻结契约里；要改就提变更单
- 当前子步骤：**c2.1** 逐条对齐：本能力的命令/事件/路由/key/token 在契约中的位置
- 下一动作：按子步骤执行，完成后 `state.mjs step --id c2.1`

## 2. 阶段阶梯

| 阶段 | 状态 | 产出 |
|---|---|---|
| C0 立项 | done | CHARTER.md |
| C1 结构对账与表面枚举 | done | evidence/symbols-*.md / symbol-map.md / ownership.md / cut-list.md / surface.json / surface.md |
| C2 契约对齐 | **in_progress** | contract-delta.md |
| C3 行为规格 | pending | behaviors.md / specs/*.md（仅 R3） / harness/registry.json |
| C4 能力设计 | pending | design/manifest.json / design/{decomposition,protocols,states,patterns,quality}.md / design/components.md / design/principles.md / design/diagrams/*.md / design/interfaces.ts / design/sequences/*.md（R3） / plans/*.md（R2/R3） |
| C5 实现 | pending | 代码 / gates/C5.json（机器证据） / review.md（R2/R3） |
| C6 行为对账 | pending | parity.md |
| C7 收割回灌 | pending | retro.md / acceptance.md（L6 人工验收已签） / GODS.md / CAPABILITIES.md 状态更新 |

## 3. 本阶段子步骤

- [ ] c2.1 逐条对齐：本能力的命令/事件/路由/key/token 在契约中的位置
- [ ] c2.2 差异写成 delta 行；非空则提契约变更单（版本 +1）
- [ ] c2.3 变更单评估：影响哪些其他能力

## 4. 输入与产出

- 输入：contracts/*.md（P1） / surface.json
- 产出：contract-delta.md
- 已登记产物：（无）
- 指纹：SkillsConfig.tsx 1089 行 sha1 8f06ea8 · 450 声明(LSP)
- 表面点：0

## 5. 漂移与风险

- 无

## 5.5 任务台账

- 无（C5 前为空；C5 起每个 T-xx 一条）

## 6. 待决项

- 无

## 7. 签字

- 无

## 8. 上次命令

- 无

## 9. 新 session 开场（3 分钟）

1. 读本文件第 1、5、6 节（在哪 / 有什么风险 / 有什么待决）
2. 只读当前阶段那一节：`references/workflow.md#c2`
3. 不重读已 done 阶段的产出，除非第 5 节报了漂移
4. 下一步就是第 1 节里的「下一动作」
