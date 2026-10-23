// 门 kind → 手工自检命令。
//
// 为什么需要：`check-phase.mjs --run <run>` 一次跑全阶段门，但人在阶段里改产物时
// 想单独验一项（比如只验行级闭合）。没有这张表，人只能去翻脚本参数——
// 然后就变成"跑一下子集，反正也过了"。
//
// 表里没登记的 kind 不是错误（有些门只能整阶段跑），但**有独立 CLI 的门必须登记**，
// 否则 `lint-skill` 的孤儿检查会发现"脚本没人引用"。

export const CLI_BY_KIND = {
  symbols: 'check-symbols.mjs --run <run>',
  coverage: 'check-lines.mjs --run <run> --mode structure',
  ownershipTypes: 'check-lines.mjs --run <run> --mode structure',
  lines: 'check-lines.mjs --run <run> --mode <structure|bind|landed>',
  trace: 'check-trace.mjs --run <run>',
  verification: 'record-verification.mjs --run <run> --id <阶段> --from-plan plans/<cap>.md',
  design: 'design-gate.mjs --run <run>',
  volume: 'check-volume.mjs --run <run>',
  specs: 'check-specs.mjs --run <run>',
  contractInventory: 'check-contracts.mjs --run <run>',
  openwikiDrift: 'check-openwiki-drift.mjs --run <run>',
  'openwiki-drift': 'check-openwiki-drift.mjs --run <run>',
  surface: 'enumerate-surface.mjs --run <run> · claim-surfaces.mjs --run <run> --report',
  gatesMap: 'check-gates-map.mjs',
  harness: 'check-phase.mjs --run <run> --phase P1',
}

/** 某个阶段的独立自检命令（去重保序，末项恒为本阶段全门）。 */
export function cliForPhase(phase) {
  const out = []
  for (const c of phase.checks || []) {
    const cmd = CLI_BY_KIND[c.kind]
    if (cmd && !out.includes(cmd)) out.push(cmd)
  }
  // 兜底：没有专用 CLI 的阶段（P2.5 / C1 / X0 这类）也必须给一条能跑的命令，
  // 否则 workflow.md 那一行会是空的——而人只会去跑"记得住的那几条"。
  const self = `check-phase.mjs --run <run> --phase ${phase.id}`
  if (!out.includes(self)) out.push(self)
  return out
}
