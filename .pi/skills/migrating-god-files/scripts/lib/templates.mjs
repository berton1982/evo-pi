// 模板 → 目标路径的**唯一事实来源**。
//
// 为什么单独一个模块：`state.mjs`（铺底）、`gen-workflow-doc.mjs`（阶段文档里的"模板"行）、
// `lint-skill.mjs`（孤儿检查）三方都需要这张表。放在 CLI 里就必然出现"文档里的模板清单
// 与 init 实际铺的东西不一致"——这正是三个文档各说各话的老毛病。
//
// 键是**阶段 id**，值是该阶段要铺的 `[模板文件名, run 内相对路径]`：
// 一个模板只归属一个阶段，所以"哪个阶段该拿哪个模板"也能被机器回答。

import { SCOPE_PHASES, SCOPES } from './phases.mjs'

export const TEMPLATE_DIR = 'references/templates'

/** 阶段 → 模板清单。新增模板必须同时在此登记，否则 lint 报"不在模板表里"。 */
export const TEMPLATE_BY_PHASE = {
  // program
  P0: [['PROGRAM.md', 'PROGRAM.md']],
  P1: [
    ['stubs.md', 'contracts/stubs.md'],
    ['environment.md', 'environment.md'],
  ],
  'P2.5': [
    ['ARCHITECTURE.md', 'ARCHITECTURE.md'],
    ['arch-rules.json', 'arch/rules.json'],
    ['frontend-arch.md', 'arch/frontend.md'],
  ],
  P3: [['CAPABILITIES.md', 'CAPABILITIES.md']],
  P4: [['cutover-plan.md', 'cutover/PLAN.md']],
  // chassis
  H0: [['chassis-contract.md', 'chassis/CONTRACT.md']],
  // capability
  C0: [['CHARTER.md', 'CHARTER.md']],
  C1: [
    ['ownership.md', 'ownership.md'],
    ['cut-list.md', 'cut-list.md'],
  ],
  C3: [
    ['spec.md', 'spec.md'],
    ['behaviors.md', 'behaviors.md'],
  ],
  C4: [
    ['design-manifest.json', 'design/manifest.json'],
    ['ui.md', 'design/ui.md'],
    ['components.md', 'design/components.md'],
    ['dynamics.md', 'design/dynamics.md'],
    ['quality.md', 'design/quality.md'],
  ],
  C5: [['integration.md', 'integration.md'], ['review.md', 'review.md']],
  C6: [['acceptance.md', 'acceptance.md'], ['parity.md', 'parity.md']],
  // cutover
  X0: [['cutover-rehearsal.md', 'cutover/REHEARSAL.md']],
}

// SCOPE_PHASES 的值是阶段 **id 字符串**（不是对象）——早先按对象比较导致整张表
// 推导成空 map，init 一个模板都不铺。判据：`TEMPLATE_MAP.program` 不能为空。
const phaseScope = (phaseId) => {
  for (const scope of SCOPES) {
    if ((SCOPE_PHASES[scope] || []).includes(phaseId)) return scope
  }
  return null
}

/** 某个阶段要铺的模板（供 workflow.md 逐阶段列出）。 */
export function templatesForPhase(phaseId) {
  return TEMPLATE_BY_PHASE[phaseId] || []
}

/** 作用域 → { 模板文件名: run 内相对路径 }（`init` 铺底用）。 */
export const TEMPLATE_MAP = (() => {
  const map = Object.fromEntries(SCOPES.map((s) => [s, {}]))
  for (const [phaseId, list] of Object.entries(TEMPLATE_BY_PHASE)) {
    const scope = phaseScope(phaseId)
    if (!scope) continue
    for (const [from, to] of list) map[scope][from] = to
  }
  return map
})()
