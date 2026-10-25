// 四向追踪：行为(B) ↔ 设计元素(D) ↔ 任务(T) ↔ 测试 ID(T-)
//
// 为什么必须有任务这一层：D1 只保证「行为有设计元素」，但设计元素可以永远没有任务去实现它
// （= 范围静默缩水）；任务也可以引用不存在的元素（= 范围静默膨胀）。
// 任务层是唯一能回答「哪个任务实现了 D-B-01」「这个任务为哪条用户可见行为服务」的地方。
//
// plans/<cap>.md 的表结构（writing-plans 产物）：
//   | 任务 | 目的 | 设计元素 | 行为 | 验收命令 | 测试 ID |
//   | T-01 | 拉取会话上下文 | D-U-01, D-P-01 | B-001 | `pnpm vitest run x` | T-01 |

import { existsSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { findMissingTestIds } from './specs.mjs'
import { columnOf, parseTables, readText, stripCell } from './tables.mjs'

// 词边界是必需的：`ST-01` 里也能匹配出 `T-01`（曾把 hook/store 的 id 误判成"引用不存在的元素"）
const IDS = /(?<![A-Za-z])[A-Z]{1,3}-[A-Za-z0-9-]+/g

export function parsePlans(runDir) {
  const dir = resolve(runDir, 'plans')
  if (!existsSync(dir)) return { files: [], tasks: [] }
  const files = readdirSync(dir).filter((f) => f.endsWith('.md'))
  const tasks = []
  for (const f of files) {
    const md = readText(resolve(dir, f)) || ''
    for (const t of parseTables(md)) {
      const idCol = columnOf(t.header, '任务')
      if (idCol < 0) continue
      const designCol = columnOf(t.header, '设计')
      const behaviorCol = columnOf(t.header, '行为')
      const acceptCol = columnOf(t.header, '验收')
      const testCol = columnOf(t.header, '测试')
      for (const row of t.rows) {
        const taskId = stripCell(row[idCol])
        if (!/^T-[A-Za-z0-9-]+$/.test(taskId)) continue
        const pick = (col) => (col >= 0 ? [...(row[col] || '').matchAll(IDS)].map((m) => m[0]) : [])
        tasks.push({
          file: f,
          id: taskId,
          design: pick(designCol),
          behaviors: pick(behaviorCol).filter((x) => x.startsWith('B-')),
          acceptance: acceptCol >= 0 ? stripCell(row[acceptCol]) : '',
          tests: (testCol >= 0 ? [...(row[testCol] || '').matchAll(/T-[A-Za-z0-9-]+/g)] : []).map(
            (m) => m[0],
          ),
        })
      }
    }
  }
  return { files, tasks }
}

/**
 * @returns {{ok:boolean, problems:string[], totals:object}}
 */
export function runTrace({ runDir, manifest, behaviors, root = '.', testDirs = [] }) {
  const { files, tasks } = parsePlans(runDir)
  const problems = []
  if (!files.length)
    return { ok: false, problems: ['缺 plans/*.md——先用 writing-plans 产出任务计划'], totals: {} }
  if (!tasks.length)
    problems.push(
      'plans/ 里没有解析到任务表（需要「任务 / 设计元素 / 行为 / 验收命令 / 测试 ID」列）',
    )

  // 设计元素不只有 elements：组件 / hook / store 同样是"任务要落的东西"。
  // 依据：C-C 的 plans 里写 T-05 → D-U-05, H-01，而 H-01 在 hooks[] 里；
  // 旧实现只认 elements[]，于是把正确的计划判成"引用了不存在的元素"。
  const designIds = new Set(
    [
      ...(manifest?.elements || []),
      ...(manifest?.components || []),
      ...(manifest?.hooks || []),
      ...(manifest?.stores || []),
    ].map((e) => e.id),
  )
  const behaviorIds = new Set((behaviors || []).map((b) => b.id))

  // 1) 任务的引用必须存在
  for (const t of tasks) {
    for (const d of t.design)
      if (!designIds.has(d)) problems.push(`${t.id} 引用了不存在的设计元素 ${d}`)
    for (const b of t.behaviors)
      if (!behaviorIds.has(b)) problems.push(`${t.id} 引用了不存在的行为 ${b}`)
    if (!t.design.length) problems.push(`${t.id} 没有关联任何设计元素——任务与设计脱钩`)
    // 基础设施形态的内部任务（领域纯函数、端口契约）不直接服务某条用户可见行为，
    // 行为在用例与 e2e 那两层被承载。硬要求每行都挂行为，只会逼人把行为 id 乱贴。
    const infraInternal = manifest?.kind === 'infrastructure'
    if (!t.behaviors.length && !infraInternal)
      problems.push(`${t.id} 没有关联任何行为——不知道它服务哪条用户可见行为`)
    if (!t.acceptance) problems.push(`${t.id} 没有验收命令`)
    if (!t.tests.length && !/manual:/i.test(t.acceptance))
      problems.push(`${t.id} 没有测试 ID，也没有 manual: 标注`)
  }

  // 2) 每个设计元素 / 行为都必须有任务承载（范围不静默缩水）
  const taskedDesign = new Set(tasks.flatMap((t) => t.design))
  const taskedBehavior = new Set(tasks.flatMap((t) => t.behaviors))
  const noTaskDesign = (manifest?.elements || [])
    .filter((e) => !['state', 'port'].includes(e.kind) && !e.deferred)
    .map((e) => e.id)
    .filter((id) => !taskedDesign.has(id))
  const noTaskBehavior = [...behaviorIds].filter((b) => !taskedBehavior.has(b))
  if (noTaskDesign.length)
    problems.push(
      `${noTaskDesign.length} 个设计元素没有任务实现：${noTaskDesign.slice(0, 4).join(', ')}`,
    )
  if (noTaskBehavior.length)
    problems.push(
      `${noTaskBehavior.length} 条行为没有任务承载：${noTaskBehavior.slice(0, 4).join(', ')}`,
    )

  // 3) 任务声明的测试 ID 必须落地
  const allTests = [...new Set(tasks.flatMap((t) => t.tests))]
  if (testDirs.length && allTests.length) {
    const missing = findMissingTestIds(allTests, testDirs, root)
    if (missing.length)
      problems.push(`${missing.length} 个测试 ID 未落地：${missing.slice(0, 6).join(', ')}`)
  }

  return {
    ok: problems.length === 0,
    problems,
    totals: {
      files: files.length,
      tasks: tasks.length,
      design: designIds.size,
      behaviors: behaviorIds.size,
      tests: allTests.length,
    },
  }
}
