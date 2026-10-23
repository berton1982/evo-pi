#!/usr/bin/env node
// 交付链单元测试——桩 / 联调 / 验收阶梯的判据本身。
//
// 为什么单独一个文件：这几道门的输入是"人手写的表格"，在 selftest 的
// 阶段链路里只能跑到"文件存在且不是铺底模板"，踩不到任何一条真判据
// （比如"真实现写了个桩"、"L6 由 agent 代签"）。判据不咬人的话，
// 它们就是又一层门禁剧场。
//
// 用法: node selftest-delivery.mjs
// 退出码: 0 = 全过；1 = 有失败

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  requiredTiers,
  runAcceptance,
  runIntegration,
  runStubCoverage,
  runStubPlan,
} from './lib/delivery.mjs'

let pass = 0
const failures = []

function expect(name, ok, detail) {
  if (ok) {
    pass++
    console.log(`✅ ${name}`)
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ''}`)
    console.log(`❌ ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

const root = mkdtempSync(join(tmpdir(), 'deliv-'))
const programDir = join(root, 'prog')
const capabilityDir = join(root, 'cap')
mkdirSync(capabilityDir, { recursive: true })
const write = (base, rel, text) => {
  const abs = join(base, rel)
  mkdirSync(join(abs, '..'), { recursive: true })
  writeFileSync(abs, text)
}

const WIRE = [
  '# wire',
  '',
  '## 命令',
  '',
  '| 命令 | 说明 | 证据 |',
  '| --- | --- | --- |',
  '| `GET /api/sessions` | 列表 | `app/api/sessions/route.ts` |',
  '| `PATCH /api/sessions` | 改名 | `app/api/sessions/route.ts` |',
  '',
  '## 事件',
  '',
  '| 事件 | 说明 | 证据 |',
  '| --- | --- | --- |',
  '| `message_end` | 结束 | `lib/agent-event-wire.test.mjs` |',
  '',
].join('\n')

const stubs = (rows) =>
  [
    '# 桩清单',
    '',
    '## 1. 桩清单',
    '',
    '| 命令/事件 | 桩实现 | 夹具 | 状态 | 理由（blocked 必填） |',
    '| --- | --- | --- | --- | --- |',
    ...rows,
    '',
  ].join('\n')

try {
  mkdirSync(join(programDir, 'contracts'), { recursive: true })
  writeFileSync(join(programDir, 'contracts', 'wire.md'), WIRE)
  write(programDir, 'fixtures/sessions-list.json', '[]\n')
  write(root, 'apps/web/shared/stubs/sessions.ts', 'export const list = 1\n')

  const ready = [
    '| `GET /api/sessions` | `apps/web/shared/stubs/sessions.ts` | `fixtures/sessions-list.json` | ready | — |',
    '| `PATCH /api/sessions` | `apps/web/shared/stubs/sessions.ts` | `fixtures/sessions-list.json` | ready | — |',
    '| `message_end` | `apps/web/shared/stubs/sessions.ts` | `fixtures/sessions-list.json` | ready | — |',
  ]

  // 1) 缺行：契约里有、桩清单里没有 → 红（这正是"独立开发前必须先把桩摆齐"的判据）
  writeFileSync(
    join(programDir, 'contracts', 'stubs.md'),
    stubs(ready.filter((r) => !r.includes('PATCH'))),
  )
  let r = runStubPlan({ programDir, root })
  expect('桩清单漏一条契约命令 → 红', !r.ok && /PATCH \/api\/sessions/.test(r.detail), r.detail)

  // 2) blocked 不写理由 → 红
  writeFileSync(
    join(programDir, 'contracts', 'stubs.md'),
    stubs([
      ...ready.slice(1),
      '| `GET /api/sessions` | `apps/web/shared/stubs/sessions.ts` | `fixtures/sessions-list.json` | blocked |  |',
    ]),
  )
  r = runStubPlan({ programDir, root })
  expect('blocked 不写理由 → 红', !r.ok && /理由/.test(r.detail), r.detail)

  // 3) ready 但夹具不存在 → 红（桩编造是第二个编造入口）
  writeFileSync(
    join(programDir, 'contracts', 'stubs.md'),
    stubs([
      '| `GET /api/sessions` | `apps/web/shared/stubs/sessions.ts` | `fixtures/missing.json` | ready | — |',
      ...ready.slice(1),
    ]),
  )
  r = runStubPlan({ programDir, root })
  expect('ready 但夹具不存在 → 红', !r.ok && /夹具/.test(r.detail), r.detail)

  // 4) 全齐 → 绿
  writeFileSync(join(programDir, 'contracts', 'stubs.md'), stubs(ready))
  r = runStubPlan({ programDir, root })
  expect('桩清单齐备 → 绿', r.ok, r.detail)

  // 5) 铺底模板（TODO 横幅）→ 红，哪怕示例行看起来齐全
  writeFileSync(
    join(programDir, 'contracts', 'stubs.md'),
    `${stubs(ready)}<!-- TODO-init-scaffold 填完删掉 -->\n`,
  )
  r = runStubPlan({ programDir, root })
  expect('铺底模板未填 → 红', !r.ok && /铺底/.test(r.detail), r.detail)

  // ---- 能力级：本能力用到的命令必须就绪 ----
  const surface = {
    entries: [
      { id: 'SF-1', kind: 'api', text: 'GET /api/sessions' },
      { id: 'SF-2', kind: 'api', text: 'PATCH /api/sessions' },
      { id: 'SF-3', kind: 'i18n', text: 'skills.title' },
    ],
  }
  writeFileSync(
    join(programDir, 'contracts', 'stubs.md'),
    stubs(ready.filter((x) => !x.includes('PATCH'))),
  )
  r = runStubCoverage({ programDir, root, surface })
  expect('本能力要用的命令没有桩 → 红', !r.ok && /PATCH/.test(r.detail), r.detail)
  writeFileSync(join(programDir, 'contracts', 'stubs.md'), stubs(ready))
  r = runStubCoverage({ programDir, root, surface })
  expect('本能力要用的命令都有桩 → 绿', r.ok, r.detail)

  // ---- 联调：桩没被真实现替换就不算联调 ----
  const integration = (rows) =>
    [
      '# 联调记录',
      '',
      '## 1. 替换表',
      '',
      '| 命令 | 桩 | 真实现 | 联调证据 |',
      '| --- | --- | --- | --- |',
      ...rows,
      '',
      '## 2. 联调中发现的问题',
      '',
      '| 现象 | 根因 | 处置 | 是否回写契约 |',
      '| --- | --- | --- | --- |',
      '| 无 | — | — | 否 |',
      '',
    ].join('\n')

  writeFileSync(
    join(capabilityDir, 'integration.md'),
    integration([
      '| `GET /api/sessions` | `apps/web/shared/stubs/sessions.ts` | 桩 | T-01 |',
      '| `PATCH /api/sessions` | `apps/web/shared/stubs/sessions.ts` | `apps/web/shared/stubs/sessions.ts` | T-02 |',
    ]),
  )
  r = runIntegration({ capabilityDir, root, surface })
  expect('真实现写成「桩」→ 红', !r.ok && /桩/.test(r.detail), r.detail)

  writeFileSync(
    join(capabilityDir, 'integration.md'),
    integration([
      '| `GET /api/sessions` | `apps/web/shared/stubs/sessions.ts` | `packages/core/src/x/http.ts` | T-01 |',
      '| `PATCH /api/sessions` | `apps/web/shared/stubs/sessions.ts` | `packages/core/src/x/patch.ts` | T-02 |',
    ]),
  )
  r = runIntegration({ capabilityDir, root, surface })
  expect('真实现文件不存在 → 红', !r.ok && /不存在/.test(r.detail), r.detail)

  write(root, 'packages/core/src/x/http.ts', 'export const http = 1\n')
  write(root, 'packages/core/src/x/patch.ts', 'export const patch = 1\n')
  writeFileSync(
    join(capabilityDir, 'integration.md'),
    integration([
      '| `GET /api/sessions` | `apps/web/shared/stubs/sessions.ts` | `packages/core/src/x/http.ts` | T-01 |',
      '| `PATCH /api/sessions` | `apps/web/shared/stubs/sessions.ts` | `packages/core/src/x/patch.ts` | gates/C5.json |',
    ]),
  )
  r = runIntegration({ capabilityDir, root, surface })
  expect('桩全部换到真实现且留证据 → 绿', r.ok, r.detail)

  // ---- 验收阶梯 ----
  expect(
    '有 api 表面点时 L5 是必需层',
    requiredTiers({ surface, mode: 'final' }).includes('L5'),
    requiredTiers({ surface, mode: 'final' }).join(','),
  )
  expect(
    '纯前端能力（无 api）可省 L5',
    !requiredTiers({
      surface: { entries: [{ id: 'SF-3', kind: 'i18n', text: 'x' }] },
      mode: 'final',
    }).includes('L5'),
  )

  const acceptance = (l6) =>
    [
      '# 验收阶梯',
      '',
      '## 1. 阶梯',
      '',
      '| 层 | 命令 | 结果 | 证据 | 签字 |',
      '| --- | --- | --- | --- | --- |',
      '| L1 算法规格 | `node -e ""` | pass | T-01 | — |',
      '| L2 架构契约 | `node -e ""` | pass | T-02 | — |',
      '| L3 组件/交互 | `node -e ""` | pass | e2e/x.spec.ts | — |',
      '| L4 行为对账 | `node -e ""` | pass | gates/C6.json | — |',
      '| L5 联调 | `node -e ""` | pass | gates/C5.json | — |',
      `| L6 人工验收 | 用户手工点 | ${l6[0]} | manual:x | ${l6[1]} |`,
      '',
    ].join('\n')

  writeFileSync(join(capabilityDir, 'acceptance.md'), acceptance(['pending', '—']))
  r = runAcceptance({ capabilityDir, surface, mode: 'pre' })
  expect('pre 阶段允许 L6 pending', r.ok, r.detail)
  r = runAcceptance({ capabilityDir, surface, mode: 'final' })
  expect('final 阶段 L6 仍 pending → 红', !r.ok && /pending/.test(r.detail), r.detail)

  writeFileSync(join(capabilityDir, 'acceptance.md'), acceptance(['pass', 'agent']))
  r = runAcceptance({ capabilityDir, surface, mode: 'final' })
  expect('L6 由 agent 代签 → 红', !r.ok && /代签/.test(r.detail), r.detail)

  writeFileSync(join(capabilityDir, 'acceptance.md'), acceptance(['pass', '用户']))
  r = runAcceptance({ capabilityDir, surface, mode: 'final' })
  expect('L6 由人签字 → 绿', r.ok, r.detail)

  // 缺层：删掉 L5 行（有 api 时必需）
  writeFileSync(
    join(capabilityDir, 'acceptance.md'),
    acceptance(['pass', '用户'])
      .split('\n')
      .filter((l) => !l.startsWith('| L5'))
      .join('\n'),
  )
  r = runAcceptance({ capabilityDir, surface, mode: 'final' })
  expect('有 api 时缺 L5 → 红', !r.ok && /L5/.test(r.detail), r.detail)
} finally {
  rmSync(root, { recursive: true, force: true })
}

console.log('')
if (failures.length) {
  console.log(`❌ ${failures.length} 个失败 / ${pass} 个通过`)
  for (const f of failures) console.log(`- ${f}`)
  process.exitCode = 1
} else {
  console.log(`✅ ${pass} 个断言全部通过`)
}
