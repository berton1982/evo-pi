#!/usr/bin/env node
// 生成 references/workflow.md —— 阶段文档不能手写。
//
// 为什么：上一代技能把「后端 6 门 + 前端 8 门」写在 4 个文件里，脚本实现却是 16 项，
// 文档与实现各自漂移。这里把 workflow.md 变成**由 lib/phases.mjs 生成的产物**：
// 阶段、子步骤、输入产出、门判据全部派生，人只补「失败处理」这类判断型说明。
//
// 用法:
//   node gen-workflow-doc.mjs           # 重写 references/workflow.md
//   node gen-workflow-doc.mjs --check   # 只校验是否过期（CI 用）
// 退出码: 0 = 一致/已写入；1 = --check 发现过期；2 = 用法错误

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cliForPhase } from './lib/gatecli.mjs'
import { checkApplies, PHASES, phasesOf, SCOPE_PHASES, SCOPES } from './lib/phases.mjs'
import { TEMPLATE_BY_PHASE, TEMPLATE_DIR } from './lib/templates.mjs'

const argv = process.argv.slice(2)
const known = new Set(['--check', '--help', '-h'])
for (const a of argv) {
  if (a.startsWith('-') && !known.has(a)) {
    console.error(`\u274c 未知参数: ${a}\nusage: node gen-workflow-doc.mjs [--check]`)
    process.exit(2)
  }
}
if (argv.includes('--help') || argv.includes('-h')) {
  console.log('usage: node gen-workflow-doc.mjs [--check]')
  process.exit(0)
}

// 失败处理是判断型知识，不能从 phases.mjs 派生，只能人写。缺一个就少一段。
const NOTES = {
  P0: 'god 未登记 → 先补全景表（这是唯一允许改全景表的时机之一，S7/X2 是另一次）。参考仓库不可用 → 停，不要用记忆代替清单。',
  P1: '某份契约抽不出来 → 说明该契约的源码还没读透，回 P0/P2 补读；**不要**用"暂定"填表，暂定会变成事实。',
  P2: '走不通就缩小路径（少一个交互），不要缩小层级（少一层架构）。hydration warning 不为 0 → 先修边界，再谈功能。',
  'P2.5':
    '通信矩阵出现空格 → 停，那说明有一类交互没人负责，后面会在每个能力里被重拍一次。禁止写"待定"。',
  P3: 'god 归不进任何能力 → 要么它其实是底盘，要么能力切分错了。一个 god 想归两个能力 → 先拆 god 的职责，再归能力。',
  P4: '回滚命令不可执行 → 等于没有回滚。先在 X0 演练一次，再写进 PLAN。',
  H0: '底盘契约与 AD 冲突 → 改底盘契约，不改 AD（AD 是全局承诺）。',
  H1: '断点矩阵过不了 → 先砍形态（少一个断点），不要用一个断点凑合所有宽度。',
  H2: '通知通道出现第二个 sink → 立刻合并；两个 sink 是"通知重复弹出"的根因。',
  H3: '差异分类未清零 → 不许进能力开发；底盘差异会被每个能力继承放大。',
  C0: '指纹与磁盘不一致 → 源码动过，回 C0 重钉；不要拿旧指纹继续。',
  C1: 'LSP 报 `No active LSP clients are ready` → 先诊断启动，不要换 grep（会得到差一个数量级的"假全"）。表面点枚举不出 → 检查源目录，不要手写几条凑数。',
  C2: 'delta 非空 → 走契约变更单并评估影响面；**不许**在本能力内私改契约。',
  C3: '某条行为写不出预期 → 说明源码还没读到那一层，回 C1 精读。表面点无法认领 → 写进 excluded 并给理由，不许留空。',
  C4: '设计门红在 D3（state 多 owner）→ 先决定真源，再画图。D8 红 → 那个模式没有观察到的症状，删掉它。**不要为了过门补字段**（那是在伪造证据）。',
  C5: '超行数 → 拆职责，不是拆文件。漂移报"隐性设计" → 要么补进设计，要么删代码。红灯不许改测试迁就实现。',
  C6: '差异未分类 → 不许 advance。无法自动采集的行为标 `kind: manual` 并留操作者签名，不许从对账表里删掉。',
  C7: '教训没有落地位置 → 转 issue 或写进 `arch/rules.json`；留在 retro 里等于没发生。',
  X0: '预演失败 → 回对应能力修，不要在割接现场修。',
  X1: '用户验收未过 → 回 X0 重演，不要"先上线再补"。',
  X2: '遗留项无 issue 号 → 不许关闭 run。',
}

function describe(c) {
  switch (c.kind) {
    case 'file':
      return `存在 \`${c.path}\`（≥${c.minBytes} B）`
    case 'heading':
      return `\`${c.path}\` 含小节 \`${c.text}\``
    case 'glob':
      return `\`${c.dir}/${c.pattern}\` 至少一个文件（≥${c.minBytes} B）`
    case 'sectionClean':
      return `\`${c.path}\` 的「${c.section.replace(/^#+\s*/, '')}」小节无 ❌/FAIL`
    case 'godFingerprint':
      return 'god 指纹（行数 + sha1）与磁盘一致'
    case 'godRegistry':
      return '全景表存在、目标 god 已登记、登记后未漂移'
    case 'godRegistryClosed':
      return '>1000 行文件全部已登记（god 清单封闭）'
    case 'godsHaveR':
      return '每个 god 有 R1/R2/R3'
    case 'lspSource':
      return '符号全集来源 = LSP（AST 降级即结论作废）'
    case 'coverage':
      return '`ownership.md` 的行区间无缝覆盖 1..N'
    case 'signoff':
      return `\`${c.artifact}\` 有效签字（改动即失效）`
    case 'rlevel':
      return '本 run 已声明 R 级'
    case 'programPrereq':
      return `纲领 run 存在：${(c.files || []).map((f) => `\`${f}\``).join(' / ')}`
    case 'contracts':
      return '6 份外部契约齐备（wire / data-format / routes / i18n / design-system / interaction）'
    case 'harness':
      return 'harness 有 capture / assert / 归一化'
    case 'fixtures':
      return '至少一个真实 .jsonl fixture'
    case 'archRules':
      return '`arch/rules.json` 可机器加载（层序/禁止边/机制/上限）'
    case 'commMatrix':
      return '通信机制矩阵覆盖 `mechanisms` 全集，且有「反例」列'
    case 'capabilityPlan':
      return '每个 god 恰好归入一个能力，且每行有 R 级'
    case 'surface':
      return `\`surface.json\` 有 ≥${c.min} 个表面点`
    case 'contractDelta':
      return '契约 delta 为空，或每条 delta 有变更单号'
    case 'behaviors':
      return '行为 ↔ 脚本双向绑定（无缺 script_id、无孤儿脚本），每条有 path:line'
    case 'specs':
      return '`specs/` 每份含端到端链路 / 决策表 / 落点'
    case 'design':
      return '设计门 D1–D10（按 R 级裁剪）'
    case 'quality':
      return '质量预算：文件行数 / 复杂度 / props 上限'
    case 'drift':
      return '`@design` 标注 ↔ 设计元素（无未实现、无隐性设计）'
    case 'parity':
      return '每条行为有对账结果，未分类差异 = 0'
    case 'retro':
      return '每条教训有落地位置'
    case 'godStatus':
      return `全景表状态已更新为「${c.status}」`
    case 'decisionsClosed':
      return '待决项已关闭或已移交'
    default:
      return c.kind
  }
}

function scopeTable() {
  return [
    '| 作用域 | 阶段序列 | 一次还是多次 |',
    '|---|---|---|',
    ...SCOPES.map(
      (s) =>
        `| \`${s}\` | ${SCOPE_PHASES[s].join(' → ')} | ${s === 'capability' ? '每能力一次' : '一次'} |`,
    ),
    '',
  ].join('\n')
}

function build() {
  const out = []
  out.push('# 工作流：四作用域 16 阶段')
  out.push('')
  out.push(
    '> **本文件由 `scripts/gen-workflow-doc.mjs` 从 `scripts/lib/phases.mjs` 生成。不要手改。**',
  )
  out.push('> 改了阶段契约就跑一次生成；`--check` 会在 CI 里对比，过期即红。')
  out.push('')
  out.push('## 0. 作用域')
  out.push('')
  out.push(scopeTable())
  out.push('## 1. R 级裁剪')
  out.push('')
  out.push('门带 `levels` 的只在对应 R 级运行；不带则全等级运行。')
  out.push('')
  out.push('| 阶段 | 门 | 适用 R 级 |')
  out.push('|---|---|---|')
  for (const p of PHASES) {
    for (const c of p.checks) {
      if (!c.levels) continue
      out.push(`| ${p.id} | ${describe(c)} | ${c.levels.join(' / ')} |`)
    }
  }
  out.push('')
  out.push('## 2. 阶段')
  out.push('')
  for (const scope of SCOPES) {
    out.push(`### 作用域 \`${scope}\``)
    out.push('')
    for (const p of phasesOf(scope)) {
      out.push(`## ${p.id} ${p.name}`)
      out.push('')
      out.push(`**目标**：${p.goal}`)
      out.push('')
      out.push(`**输入**：${p.consumes.map((x) => `\`${x}\``).join(' · ')}`)
      out.push('')
      out.push('**子步骤**')
      out.push('')
      out.push('| 子步骤 | 做什么 |')
      out.push('|---|---|')
      for (const s of p.substeps) out.push(`| \`${s.id}\` | ${s.task} |`)
      out.push('')
      out.push(`**产出**：${p.produces.map((x) => `\`${x}\``).join(' · ')}`)
      out.push('')
      // 模板行：没有它，agent 到这一步只能照门猜标题（历史上就这么错过 6 次）。
      const tpl = TEMPLATE_BY_PHASE[p.id] || []
      if (tpl.length) {
        const items = tpl.map(([from, to]) => `\`${TEMPLATE_DIR}/${from}\` → \`${to}\``)
        out.push(`**模板**：${items.join(' · ')}（\`init\` 会铺到目标路径，顶部横幅不删即判红）`)
        out.push('')
      }
      out.push('**门（机器判据）**')
      out.push('')
      for (const c of p.checks) {
        const levels = c.levels ? `（仅 ${c.levels.join('/')}）` : ''
        out.push(`- ${describe(c)}${levels}`)
      }
      out.push('')
      const clis = cliForPhase(p)
      if (clis.length) {
        out.push(`**只验这一项**（不用整阶段重跑）：${clis.map((x) => `\`${x}\``).join(' · ')}`)
        out.push('')
      }
      out.push(`**失败处理**：${NOTES[p.id] || '修产物，不要绕门。'}`)
      out.push('')
    }
  }
  out.push('## 3. 通用规则')
  out.push('')
  out.push('1. **门不过不推进**：`advance` 会先跑当前阶段门，红则 `exit 1` 并拒绝。')
  out.push('2. **签字绑定指纹**：签字后产物被改动 → 签字自动失效（`status` 会报）。')
  out.push(
    '3. **门写错就改门**：改 `lib/phases.mjs` 并在 `PROGRAM.md` 记录原门为何不合理；不许用"放宽阈值"让它变绿。',
  )
  out.push('4. **启发式不作门**：行数、正则三态这类只能进报告提示；错判成本由人承担。')
  out.push('')
  return out.join('\n')
}

const target = resolve(import.meta.dirname, '../references/workflow.md')
const next = build()

if (argv.includes('--check')) {
  if (!existsSync(target)) {
    console.error(`\u274c ${target} 不存在——先跑 node gen-workflow-doc.mjs`)
    process.exit(1)
  }
  const cur = readFileSync(target, 'utf8')
  if (cur.trim() !== next.trim()) {
    console.error(
      '\u274c references/workflow.md 与 lib/phases.mjs 不一致——跑 node gen-workflow-doc.mjs',
    )
    process.exit(1)
  }
  console.log('\u2705 workflow.md 与阶段契约一致')
  process.exit(0)
}

writeFileSync(target, next)
console.log(
  `\u2705 已生成 ${target.replace(`${resolve(import.meta.dirname, '../../..')}/`, '')}（${next.split('\n').length} 行）`,
)

// 供 lint-skill 复用判据
export { build, checkApplies }
