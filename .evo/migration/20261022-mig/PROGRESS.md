# 迁移进展 — .evo/migration/20261022-mig

> 由 `state.mjs status` 自动生成。**不要手改**：手改 = 下一个 session 读到的是假进展。
> 生成时间：2026-10-22T03:30:05.509Z
> 作用域：**program**

## 1. 现在在哪

- 阶段：**P4 割接预案**（done）
- 阶段目标：割接不是一个日期，是一套可演练、可回滚的流程
- 当前子步骤：**p4.1** 割接日 + 双跑窗口 + pi-web 冻结归档方式
- 下一动作：按子步骤执行，完成后 `state.mjs step --id p4.1`

## 2. 阶段阶梯

| 阶段 | 状态 | 产出 |
|---|---|---|
| P0 纲领与分级 | done | PROGRAM.md / GODS.md（补 R 级列） |
| P1 契约冻结 | done | contracts/{wire,data-format,routes,i18n,design-system,interaction}.md / contracts/schema.ts / fixtures/ / harness/ / contracts/stubs.md（前后端独立开发用的桩清单） |
| P2 骨架贯通 | done | 可运行代码 / harness/report/skeleton.md / gates/P2.json（真实 smoke 证据） |
| P2.5 全局架构设计 | done | ARCHITECTURE.md / arch/{layers,communication,states,errors,streaming}.md / arch/rules.json |
| P3 能力切片与排期 | done | CAPABILITIES.md |
| P4 割接预案 | done | cutover/PLAN.md |

## 3. 本阶段子步骤

- [ ] p4.1 割接日 + 双跑窗口 + pi-web 冻结归档方式
- [ ] p4.2 回滚条件与回滚命令（必须可执行，不是口号）
- [ ] p4.3 验收口径：对齐 MEMORY §6.3 五道门
- [ ] p4.4 预演标准：什么算预演通过

## 4. 输入与产出

- 输入：CAPABILITIES.md / 数据兼容事实（PI_CODING_AGENT_DIR 共享）
- 产出：cutover/PLAN.md
- 已登记产物：（无）
- 指纹：（本作用域不涉及具体 god）
- 表面点：0

## 5. 漂移与风险

- 无

## 5.5 任务台账

- 无（C5 前为空；C5 起每个 T-xx 一条）

## 6. 待决项

- 无

## 7. 签字

- ARCHITECTURE.md · agent（试点代签，待用户复核） · 2026-10-22T03:06:26.248Z
- CAPABILITIES.md · agent（试点代签，待用户复核） · 2026-10-22T03:06:51.554Z

## 8. 上次命令

- 无

## 9. 新 session 开场（3 分钟）

1. 读本文件第 1、5、6 节（在哪 / 有什么风险 / 有什么待决）
2. 只读当前阶段那一节：`references/workflow.md#p4`
3. 不重读已 done 阶段的产出，除非第 5 节报了漂移
4. 下一步就是第 1 节里的「下一动作」
