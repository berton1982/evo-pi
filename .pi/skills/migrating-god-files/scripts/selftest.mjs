#!/usr/bin/env node
// 脚本自测——给「验器」本身一个验器。
//
// 覆盖四个作用域的真实链路（program → chassis → capability → 负例），
// 以及设计门 D1–D10、质量预算、漂移反查、表面枚举的确定性与漂移检测。
//
// 为什么必须：上一代技能有 17 个校验脚本、零测试；其中「未知参数 → 退出码 0」
// 会把门静默关掉。验器不可信时，所有"机器可判"都是纸面的。
//
// 用法: node selftest.mjs
// 退出码: 0 = 全过；1 = 有失败

import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { checkUiProto } from './lib/capspec.mjs'
import { checkContractInventory, checkContractAlign, checkSchema } from './lib/contracts.mjs'
import { checkExternalIo } from './lib/external.mjs'
import { checkFidelity } from './lib/fidelity.mjs'
import { runFrontendArch } from './lib/frontend.mjs'
import { checkEnvDoc } from './lib/envdoc.mjs'
import { globToRegExp, layerOf } from './lib/placement.mjs'
import { runStubPlan, runIntegration, runAcceptance } from './lib/delivery.mjs'
import { runOwnershipTypes } from './lib/ownership.mjs'
import { runSymbolParity } from './lib/parity.mjs'
import { resolveAnchors } from './lib/specs.mjs'

const sha8 = (p) => createHash('sha1').update(readFileSync(p)).digest('hex').slice(0, 8)
const refreshParitySha = () => {
  const pp = join(root, states.cap, 'parity.md')
  if (!existsSync(pp)) return
  writeFileSync(
    pp,
    readFileSync(pp, 'utf8').replace(/sha [0-9a-f]{8}/, `sha ${sha8(join(root, states.cap, 'behaviors.md'))}`),
  )
}
const HERE = resolve(import.meta.dirname)
const STATE = join(HERE, 'state.mjs')
const CHECK = join(HERE, 'check-phase.mjs')
const DESIGN = join(HERE, 'design-gate.mjs')
const SURFACE = join(HERE, 'enumerate-surface.mjs')
const LINT = join(HERE, 'lint-skill.mjs')
const SYMBOLS = join(HERE, 'check-symbols.mjs')
const SPECS = join(HERE, 'check-specs.mjs')
const CONTRACTS = join(HERE, 'check-contracts.mjs')
const DRIFT = join(HERE, 'check-openwiki-drift.mjs')
const VERIFY = join(HERE, 'record-verification.mjs')
const TRACE = join(HERE, 'check-trace.mjs')
const VOLUME = join(HERE, 'check-volume.mjs')
const SEED = join(HERE, 'init-symbol-map.mjs')
const CLAIM = join(HERE, 'claim-surfaces.mjs')
const LINES = join(HERE, 'check-lines.mjs')

let pass = 0
const failures = []

// 断言"输出里必须出现某个门/字符串"——exit 码只说明"红了"，说不出"哪个门红的"
const expectContains = (name, res, needle) => {
  if ((res.out ?? '').includes(needle)) ok(name)
  else bad(name, `输出里没有「${needle}」\n${res.out}`)
}

const expectNotContains = (name, res, needle) => {
  if (!(res.out ?? '').includes(needle)) ok(name)
  else bad(name, `输出里不该出现「${needle}」\n${res.out}`)
}

const ok = (n) => {
  pass++
  console.log(`\u2705 ${n}`)
}
const bad = (n, d) => {
  failures.push(`${n} — ${d}`)
  console.log(`\u274c ${n}\n   ${String(d).split('\n').slice(0, 40).join('\n   ')}`)
}

function run(script, args) {
  try {
    return {
      code: 0,
      out: execFileSync(process.execPath, [script, ...args], {
        cwd: root,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      }),
    }
  } catch (e) {
    return { code: e.status ?? 1, out: `${e.stdout || ''}${e.stderr || ''}` }
  }
}

const expect = (name, res, want) => {
  if (res.code === want) ok(name)
  else bad(name, `期望 exit ${want}，实际 ${res.code}\n${res.out}`)
}

const root = mkdtempSync(join(tmpdir(), 'mgf-selftest-'))
const w = (rel, body) => {
  const p = join(root, rel)
  mkdirSync(dirname(p), { recursive: true })
  writeFileSync(p, body)
}
const wp = (rel, bd) => w(`${states.program}/${rel}`, bd)
const states = {
  program: '.evo/migration/20990101-prog',
  chassis: '.evo/migration/20990101-chassis',
  cap: '.evo/migration/20990101-cap-fixture',
  cutover: '.evo/migration/20990101-cutover',
}
const adv = (which, target) => {
  const res = run(STATE, ['advance', '--root', root, '--run', states[which]])
  if (res.code !== 0) return bad(`${which} advance → ${target}`, res.out)
  if (target && !res.out.includes(target)) return bad(`${which} advance → ${target}`, res.out)
  ok(`${which} advance → ${target}`)
}
// 只取退出码：用于「应被拒绝」的推进断言（不打印成功/失败）
const advCode = (which) => ({ code: run(STATE, ['advance', '--root', root, '--run', states[which]]).code })
const body = (n, s) => `${s.repeat(Math.ceil(n / s.length))}\n`
const table = (header, rows) =>
  [
    `| ${header.join(' | ')} |`,
    `|${header.map(() => '---').join('|')}|`,
    ...rows.map((r) => `| ${r.join(' | ')} |`),
    '',
  ].join('\n')

try {
  // ═════════ 0) 参考仓库与 GODS.md（program 的前置） ═════════
  const bigLines = Array.from({ length: 1200 }, (_, i) => `export const v${i} = ${i}`).join('\n')
  w('ref_projects/pi-web/components/Fixture.tsx', `${bigLines}\n`)
  w(
    '.evo/migration/GODS.md',
    [
      '# god 全景',
      '',
      table(
        ['#', 'god', '路径', '行数', '依赖 god', 'R 级', '状态', '迁移目录'],
        [['1', '`Fixture.tsx`', '`components/Fixture.tsx`', '1200', '—', 'R3', '待开始', '—']],
      ),
    ].join('\n'),
  )

  // 表面枚举用的最小源码（6 个表面点）
  w(
    'fake-src/Cap.tsx',
    [
      'export function Cap() {',
      "  const q = searchParams.get('session')",
      '  return (',
      '    <div role="main" aria-label="cap">',
      '      <button onClick={() => go(q)}>open</button>',
      '      <input onChange={(e) => set(e.target.value)} />',
      "      <span>{key === 'Enter' ? 'a' : 'b'}</span>",
      '    </div>',
      '  )',
      '}',
      '',
    ].join('\n'),
  )

  // ═════════ 1) Program：P0 → P4 ═════════
  let r = run(STATE, ['init', '--root', root, '--run', states.program, '--scope', 'program'])
  expect('P: init 建档', r, 0)

  // init 会铺模板，但横幅（TODO-init-scaffold）还在 → 门必须红，不能靠"文件存在"过关
  expect(
    'P: init 铺底模板（PROGRAM.md 带 TODO 横幅）',
    {
      code: readFileSync(join(root, states.program, 'PROGRAM.md'), 'utf8').includes(
        'TODO-init-scaffold',
      )
        ? 0
        : 1,
      out: '',
    },
    0,
  )
  r = run(STATE, ['advance', '--root', root, '--run', states.program])
  expect('P0 模板未填写时拒绝', r, 1)

  wp(
    'PROGRAM.md',
    [
      '# 纲领',
      '',
      '## 1. 成功定义',
      '',
      body(200, '日常使用不低于 pi-web；行为对账分类全部闭合。'),
      '## 2. 不做清单',
      '',
      body(120, '不做多用户、不做云端同步、不做移动端原生。'),
      '## 3. 容量假设',
      '',
      body(120, 'M1 五个能力 8-10 周；偏差超过 30% 就重排。'),
      '',
    ].join('\n'),
  )
  if (states.program) adv('program', 'P1')

  // P1
  const contracts = ['wire', 'data-format', 'routes', 'i18n', 'design-system', 'interaction']
  for (const c of contracts)
    wp(`contracts/${c}.md`, body(200, `# ${c} 契约\n\n条目带路径行号证据。\n`))
  wp(
    'contracts/data-format.md',
    [
      '# data-format',
      '',
      table(
        ['字段', '类型', '说明'],
        [
          ['id', 'string', '会话 id'],
          ['cwd', 'string', '工作目录'],
          ['created', 'string', 'ISO 时间'],
        ],
      ),
      '',
    ].join('\n'),
  )
  wp(
    'contracts/schema.ts',
    [
      "import { z } from 'zod'",
      '',
      'export const SessionInfoDtoSchema = z.object({',
      '  id: z.string().min(1),',
      '  cwd: z.string(),',
      '  created: z.string(),',
      '})',
      '',
    ].join('\n'),
  )
  wp(
    'contracts/wire.md',
    [
      '# wire 契约',
      '',
      '每条命令与事件都带源码证据；错误码为封闭枚举。',
      '',
      '## 命令',
      '',
      table(
        ['命令', '入参', '出参', '证据'],
        [['sessions.list', 'cwd', 'SessionInfoDto[]', 'src:1']],
      ),
      '## 事件',
      '',
      table(['事件', '载荷', '证据'], [['stream.chunk', '{ delta }', 'src:2']]),
      '## 错误码',
      '',
      table(
        ['码', '语义'],
        [
          ['NOT_FOUND', '会话不存在'],
          ['INVALID', '参数不合法'],
        ],
      ),
      '',
    ].join('\n'),
  )
  // 桩清单（P1 门 stubPlan）：契约里的每条命令/事件都要有桩与夹具
  wp('apps/web/shared/stubs/sessions.ts', 'export const list = () => []\n')
  wp('fixtures/sessions-list.json', '[{"id":"s1","cwd":"/tmp"}]\n')
  wp(
    'contracts/stubs.md',
    [
      '# 桩清单',
      '',
      table(
        ['命令/事件', '桩实现', '夹具', '状态', '理由'],
        [
          [
            'sessions.list',
            'apps/web/shared/stubs/sessions.ts',
            'fixtures/sessions-list.json',
            'ready',
            '—',
          ],
          [
            'stream.chunk',
            'apps/web/shared/stubs/sessions.ts',
            'fixtures/sessions-list.json',
            'ready',
            '—',
          ],
        ],
      ),
      '',
    ].join('\n'),
  )
  wp('harness/README.md', '# harness\n\n离线快照 + 断言两侧。\n')
  // P6 环境矩阵：init 只铺底（带横幅 → produces 判红），这里写真实内容
  w(
    `${states.program}/environment.md`,
    [
      '# 环境矩阵 — fixture',
      '',
      '## 1. 端口与进程',
      '',
      '| 项 | 值 | 说明 |',
      '| --- | --- | --- |',
      '| pi-web 参照站 | `30141` | 只读参照，本仓不占用 |',
      '| evo-pi 验收入口 | `30041` | `next start` 生产构建 |',
      '| 停服务 | `fuser -k 30041/tcp` | 收尾必做 |',
      '',
      '## 2. 环境变量',
      '',
      '| 项 | 值 | 说明 |',
      '| --- | --- | --- |',
      '| `PI_CODING_AGENT_DIR` | `/tmp/fixture-agent` | 必须隔离，不写真实 `~/.pi/agent` |',
      '',
      '## 3. 构建与运行',
      '',
      '| 项 | 值 | 说明 |',
      '| --- | --- | --- |',
      '| 启动 | `next start -p 30041` | dev 模式会因 StrictMode 反复挂载 |',
      '',
      '## 4. 工具链版本',
      '',
      '| 项 | 值 | 说明 |',
      '| --- | --- | --- |',
      '| tsserver | `.pi/supi/config.json` 指向全局 `tsserver.js` | 5.9.x；7.x 没有 tsserver.js |',
      '',
      '## 5. 夹具与隔离',
      '',
      '| 项 | 值 | 说明 |',
      '| --- | --- | --- |',
      '| 夹具 | `fixtures/` | 每例复位 |',
      '',
    ].join('\n'),
  )

  wp(
    'harness/registry.json',
    [
      '{',
      '  "flows": [',
      '    { "id": "open-session", "status": "captured", "capturedFrom": "snapshot@2026-10-21" },',
      '    { "id": "abort-run", "status": "manual", "reason": "Esc 中止的时序竞态在无头浏览器里不稳定，人工验" }',
      '  ],',
      '  "scripts": [{ "id": "s-01", "file": "e2e/b01.spec.ts", "kind": "auto" }]',
      '}',
      '',
    ].join('\n'),
  )
  wp('harness/assert.mjs', 'export const normalize = (v) => v\n')
  wp('harness/snapshot/open-session/a11y.json', '{"nodes":[{"role":"button","name":"open"}]}\n')
  wp('harness/snapshot/open-session/dom.json', '{"html":"<main><button>open</button></main>"}\n')
  wp('fixtures/session.jsonl', `${body(200, '{"type":"message","text":"hi"}\n')}`)
  // harness 门：结构事实 vs 关键词（此时 state 还停在 P1）
  const har = readFileSync(join(root, states.program, 'harness/registry.json'), 'utf8')
  wp(
    'harness/registry.json',
    har
      .replace('"status": "captured"', '"status": "captured", "note": "x"')
      .replace('open-session', 'ghost-flow'),
  )
  if (states.program)
    expect(
      'harness captured 但无快照 → 红',
      run(CHECK, ['--root', root, '--run', states.program, '--phase', 'P1']),
      1,
    )
  wp(
    'harness/registry.json',
    har.replace('"reason": "Esc 中止的时序竞态在无头浏览器里不稳定，人工验"', '"reason": ""'),
  )
  if (states.program)
    expect(
      'harness manual 无 reason → 红',
      run(CHECK, ['--root', root, '--run', states.program, '--phase', 'P1']),
      1,
    )
  wp('harness/registry.json', har)
  if (states.program)
    expect(
      'harness 结构齐全 → 绿',
      run(CHECK, ['--root', root, '--run', states.program, '--phase', 'P1']),
      0,
    )
  if (states.program) adv('program', 'P2')

  // P2
  wp(
    'harness/report/skeleton.md',
    [
      '# 骨架贯通',
      '',
      '## 走通的路径',
      '',
      '列表 → 选会话 → 读消息 → 发送 → 流式 → 落盘 → URL 同步，全部在 30041 实跑。',
      '对账装置在两侧各跑一遍，报告已附。',
      '',
      '## 硬门',
      '',
      '- \u2705 tsc --noEmit',
      '- \u2705 单测与契约测试绿',
      '- \u2705 web 不 import core/adapters',
      '- \u2705 hydration warning = 0',
      '',
    ].join('\n'),
  )
  // P2 不再靠"报告里写了未贯通也能过"，必须有命令跑过
  if (states.program)
    expect(
      'P2 无 gates/P2.json → 拒绝推进',
      run(STATE, ['advance', '--root', root, '--run', states.program]),
      1,
    )
  if (states.program)
    expect(
      'P2 记证据',
      run(VERIFY, [
        '--root',
        root,
        '--run',
        states.program,
        '--id',
        'P2',
        '--cmd',
        'node -e "process.exit(0)"',
      ]),
      0,
    )
  if (states.program) adv('program', 'P2.5')

  // P2.5
  const mechanisms = [
    'props',
    'callback',
    'store',
    'server-cache',
    'url',
    'notification-sink',
    'stream-reducer',
  ]
  wp(
    'arch/conventions.json',
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        totalFiles: 3,
        layers: [
          { layer: 'domain', files: 1, paths: [{ path: 'packages/core/src/cap-x/domain', files: 1 }], samples: ['packages/core/src/cap-x/domain/x.ts'] },
          { layer: 'use-cases', files: 2, paths: [{ path: 'packages/core/src/cap-x/use-cases', files: 2 }], samples: ['packages/core/src/cap-x/use-cases/open-session.ts'] },
          { layer: 'adapters', files: 1, paths: [{ path: 'packages/core/src/cap-x/adapters', files: 1 }], samples: ['packages/core/src/cap-x/adapters/http.ts'] },
          { layer: 'ui', files: 1, paths: [{ path: 'packages/web/src/cap-x', files: 1 }], samples: ['packages/web/src/cap-x/foo.ts'] },
        ],
        packages: [{ name: 'core', path: 'packages/core', exists: true }],
      },
      null,
      2,
    )}\n`,
  )
  wp(
    'arch/rules.json',
    `${JSON.stringify(
      {
        layerOrder: ['domain', 'use-cases', 'ports', 'adapters', 'infrastructure', 'ui'],
        // 层路径 = 落点判据（placement 门）：写出来的目录必须真实存在于仓库事实里
        // 层名与 layerOrder 一致；每个落点必须命中其中一个（没有"兜底层"）
        layerPaths: {
          domain: 'packages/core/src/*/domain/**',
          'use-cases': 'packages/core/src/*/use-cases/**',
          adapters: 'packages/core/src/*/adapters/**',
          ui: 'packages/web/src/**',
        },
        forbiddenEdges: [{ from: 'packages/web/**', to: '**/adapters/**' }],
        mechanisms,
        maxFileLines: { core: 300, web: 250 },
        // C 项判据：web 新代码只能落在 features/<slice>/ 等允许的根下（webScaffold 门）
        web: {
          enabled: true,
          root: 'web/src',
          slices: 'features',
          allowedRoots: ['app', 'shell', 'features', 'components/ui'],
          template: '_template',
        },
        frontend: {
          doc: 'arch/frontend.md',
          layers: ['ui', 'features', 'shared'],
          stateClasses: [
            {
              name: 'server',
              rule: '来自后端的列表与详情，走 query 缓存，不拷进 store',
              forbidden: '拷进 store 再手动同步',
            },
            {
              name: 'url',
              rule: '刷新要还原、要能分享的参数（cwd、选中会话）',
              forbidden: '只放 store 导致刷新丢失',
            },
            {
              name: 'store',
              rule: '跨组件共享的客户端状态，一个状态一个持有者',
              forbidden: '组件局部状态提升到全局',
            },
            {
              name: 'local',
              rule: '只影响本组件渲染的宿主状态',
              forbidden: '打开的浮层状态放全局',
            },
          ],
          forbidden: ['组件内直接 fetch', '组件内手写 aria-*', 'features/a 直接 import features/b'],
          budgets: { firstInteractiveMs: 2000, sessionSwitchMs: 300 },
        },
      },
      null,
      2,
    )}\n`,
  )
  wp(
    'arch/frontend.md',
    [
      '# 前端架构约定',
      '',
      '## 1. 分层与目录',
      '',
      'ui（app/**）→ features/<cap> → shared；features 之间不许互相 import。',
      '',
      '## 2. 状态的分类与归属',
      '',
      'server / url / store / local 四类，一个状态只有一个持有者，其余全部派生；跨组件共享才升到 store。',
      '',
      '## 3. 数据获取与缓存',
      '',
      '组件不直接 fetch；写操作按 key 精确失效；isLoading 与 isFetching 分开。',
      '',
      '## 4. 三态与错误',
      '',
      'loading / empty / error 分别建模；错误按"用户能不能修"分类。',
      '',
      '## 5. 组件与 props',
      '',
      '容器与展示分离；props ≤6；不许往下传 setter。',
      '',
      '## 6. 样式与 token',
      '',
      '唯一来源是 globals.css 的 -- 变量；禁止组件内写 hex 或 px 魔法值；断点集中在配置里，不散落在组件中。',
      '',
      '## 7. 可访问性与键盘',
      '',
      'role/aria 由 shared 原语承担，页面层不手写；打开浮层焦点进入、关闭回到触发器；快捷键必须有作用域，输入框内不触发。',
      '',
      '## 8. 测试与预算',
      '',
      'L1 单元 / L3 组件 / L5 联调；首屏 <2s，会话切换 <300ms。每条规则一个用例，只断言 a11y 锚点，不存快照大图；预算超标即红，不允许"下次优化"。三态各自有测试，错误态必须能重试。',
      '',
    ].join('\n'),
  )
  wp('arch/layers.md', body(150, '层序与禁止边。\n'))
  wp('arch/states.md', body(150, '服务端数据归 server-cache；UI 归 store；可分享状态归 URL。\n'))
  wp(
    'arch/errors.md',
    body(150, '错误分类封闭枚举：NotFound / Invalid / Unavailable / Unknown。\n'),
  )
  wp('arch/streaming.md', body(150, '流式唯一入口 + 唯一 reducer。\n'))
  wp(
    'arch/communication.md',
    [
      '# 通信机制',
      '',
      table(
        ['交互类别', '机制', '反例'],
        [
          ['父传子', 'props', '子读父 store'],
          ['子传父', 'callback', '回调里改跨域状态'],
          ['跨子树 UI', 'store', '三个 store 存同一份'],
          ['服务端数据', 'server-cache', 'store 存 messages 副本'],
          ['可分享状态', 'url', '只存 store'],
          ['通知', 'notification-sink', '组件自己管子节点'],
          ['流式增量', 'stream-reducer', 'useEffect 直连 SSE'],
        ],
      ),
    ].join('\n'),
  )
  wp(
    'ARCHITECTURE.md',
    [
      '# 架构',
      '',
      '## 1. 层与禁止边',
      '',
      // conventions 门会核对"AD 有没有讲这个仓库真实存在的层"
      body(120, 'domain 不依赖上层；use-cases 依赖 ports；adapters 实现 ports；ui 只依赖用例。'),
      '## 2. 通信机制',
      '',
      '见 arch/communication.md。',
      '',
      '## 3. 状态归属',
      '',
      body(120, 'server-cache 唯一真源。'),
      '## 5. 流式与订阅',
      '',
      body(120, '唯一入口 stream-reducer。'),
      '',
    ].join('\n'),
  )
  r = run(STATE, [
    'signoff',
    '--reauth',
    '--root',
    root,
    '--run',
    states.program,
    '--artifact',
    'ARCHITECTURE.md',
    '--by',
    'user',
    '--saw',
    '已按门判据逐条看过',
  ])
  expect('P2.5 签架构', r, 0)
  if (states.program) adv('program', 'P3')

  // P3
  wp(
    'CAPABILITIES.md',
    [
      '# 能力切片',
      '',
      '## 1. 能力清单',
      '',
      table(
        ['#', '能力', '包含 god', 'R 级', '依赖', '状态'],
        [['C-1', 'fixture 能力', '`Fixture.tsx`', 'R3', '—', '待开始']],
      ),
      '## 2. 拓扑序',
      '',
      'C-1 → 割接。依赖无环：C-1 不依赖任何其他能力，割接依赖全部能力。',
      '',
      '## 3. 裁线',
      '',
      'M1 = C-1（能当日常工具用的最小集合）。M2 = 其余能力，可后置到割接前补齐。',
      '每周回填实际与预估，偏差超过 30% 重排。',
      '',
    ].join('\n'),
  )
  r = run(STATE, [
    'signoff',
    '--reauth',
    '--root',
    root,
    '--run',
    states.program,
    '--artifact',
    'CAPABILITIES.md',
    '--by',
    'user',
    '--saw',
    '已按门判据逐条看过',
  ])
  expect('P3 签切片', r, 0)
  if (states.program) adv('program', 'P4')

  // P4
  wp(
    'cutover/PLAN.md',
    [
      '# 割接预案',
      '',
      '## 回滚',
      '',
      '`kill -TERM $(lsof -ti:30041)` 并切回 pi-web。',
      '',
      '## 验收口径',
      '',
      body(120, '对齐 MEMORY 五道门。'),
      '## 预演标准',
      '',
      body(120, '真实数据副本跑全日流程且回滚演练通过。'),
      '',
    ].join('\n'),
  )
  adv('program', null)
  r = run(CHECK, ['--root', root, '--run', states.program, '--all'])
  expect('Program 全阶段门 --all 全绿', r, 0)

  // ═════════ 2) 表面枚举：确定性 + 漂移检测 ═════════
  w(
    `${states.cap}/cut-list.md`,
    [
      '# 砍掉清单',
      '',
      table(
        ['原代码', '范围', '理由', '影响'],
        [['常量表', 'L1101-L1200', '由 evo-pi 配置中心统一提供', '无调用方依赖这些字面量']],
      ),
      '',
    ].join('\n'),
  )
  r = run(SURFACE, ['--root', root, '--run', states.cap, '--src', 'fake-src'])
  expect('表面枚举生成 surface.json', r, 0)
  const surface1 = JSON.parse(readFileSync(join(root, states.cap, 'surface.json'), 'utf8'))
  if (surface1.entries.length >= 5) ok(`表面枚举得到 ${surface1.entries.length} 个表面点`)
  else bad('表面枚举得到足够表面点', `只有 ${surface1.entries.length}`)
  r = run(SURFACE, ['--root', root, '--run', states.cap, '--src', 'fake-src'])
  const surface2 = JSON.parse(readFileSync(join(root, states.cap, 'surface.json'), 'utf8'))
  if (
    JSON.stringify(surface1.entries.map((e) => e.id)) ===
    JSON.stringify(surface2.entries.map((e) => e.id))
  ) {
    ok('表面 ID 可复现（同样输入 → 同样 ID）')
  } else bad('表面 ID 可复现', '两次枚举 ID 不一致')
  w(
    'fake-src/Cap.tsx',
    `${readFileSync(join(root, 'fake-src/Cap.tsx'), 'utf8')}export const extra = <b onBlur={() => 0} />\n`,
  )
  r = run(SURFACE, ['--root', root, '--run', states.cap, '--src', 'fake-src', '--check'])
  expect('表面漂移 --check 报红', r, 1)
  r = run(SURFACE, ['--root', root, '--run', states.cap, '--src', 'fake-src', '--dir', 'x'])
  expect('表面枚举未知参数 → exit 2', r, 2)

  // ═════════ 3) Chassis：H0 → H3 ═════════
  r = run(STATE, [
    'init',
    '--root',
    root,
    '--run',
    states.chassis,
    '--scope',
    'chassis',
    '--program',
    states.program,
  ])
  expect('H: init 建档', r, 0)
  w(
    `${states.chassis}/chassis/CONTRACT.md`,
    [
      '# 底盘契约',
      '',
      '## 1. 区域与几何',
      '',
      body(80, 'left/center/right。'),
      '## 2. Token 命名',
      '',
      body(80, 'color/space/radius。'),
      '## 3. 路由与 URL',
      '',
      body(80, '?session= ?cwd=。'),
      '## 4. 焦点与键盘',
      '',
      body(80, '焦点环/trap/skip。'),
      '## 5. i18n 命名空间',
      '',
      body(80, 'common/sidebar/chat。'),
      '',
    ].join('\n'),
  )
  r = run(STATE, [
    'signoff',
    '--reauth',
    '--root',
    root,
    '--run',
    states.chassis,
    '--artifact',
    'chassis/CONTRACT.md',
    '--by',
    'user',
    '--saw',
    '已按门判据逐条看过',
  ])
  expect('H0 签底盘契约', r, 0)
  adv('chassis', 'H1')
  w(
    `${states.chassis}/chassis/layout.md`,
    [
      '# 布局',
      '',
      '## 断点矩阵',
      '',
      body(60, '1280/1024/390。'),
      '## 面板持久化',
      '',
      body(60, '刷新恢复。'),
      '## 不承载的业务状态',
      '',
      body(60, '无业务状态。'),
      '',
    ].join('\n'),
  )
  adv('chassis', 'H2')
  w(
    `${states.chassis}/chassis/framework.md`,
    [
      '# 框架',
      '',
      '## 路由与 URL 矩阵',
      '',
      body(60, '深链/后退/刷新。'),
      '## 通知通道',
      '',
      body(60, '单一 sink。'),
      '## 键盘与焦点',
      '',
      body(60, 'trap/return/skip。'),
      '',
    ].join('\n'),
  )
  adv('chassis', 'H3')
  w(
    `${states.chassis}/chassis/PARITY.md`,
    [
      '# 底盘验收',
      '',
      '## 结构不变量',
      '',
      '- \u2705 断点无重叠',
      '- \u2705 无横向滚动',
      '',
      '## 差异分类',
      '',
      body(60, '差异全部归类。'),
      '',
    ].join('\n'),
  )
  adv('chassis', null)
  r = run(CHECK, ['--root', root, '--run', states.chassis, '--all'])
  expect('Chassis 全阶段门 --all 全绿', r, 0)

  // ═════════ 4) Capability R3：C0 → C7 ═════════
  r = run(STATE, [
    'init',
    '--root',
    root,
    '--run',
    states.cap,
    '--scope',
    'capability',
    '--rlevel',
    'R3',
    '--program',
    states.program,
    '--god',
    'ref_projects/pi-web/components/Fixture.tsx',
  ])
  expect('C: init 建档', r, 0)

  w(
    `${states.cap}/CHARTER.md`,
    [
      '# 立项 — fixture 能力',
      '',
      '## 1. 范围',
      '',
      '只迁 `Fixture.tsx`（1200 行），用于自测。范围外的东西不碰。',
      '',
      '## 2. 基线指纹',
      '',
      '- 行数与 sha1 由 `state.mjs init` 钉住，文档里不手写数字（对手写数字的信任是上一代的教训）。',
      '',
      '## 3. 不做清单',
      '',
      '- 不做会话面渲染、不做文件预览、不做 MCP 配置。',
      '- 不做性能优化（本能力不涉及渲染热点）。',
      '',
      '## 4. 渲染边界',
      '',
      table(
        ['区域', '宿主', '说明'],
        [
          ['侧栏', 'shell', '壳负责摆放与开关，本能力只填内容'],
          ['主区', 'self', '本能力渲染消息列表与输入区'],
          ['顶栏', 'other:C-B', '顶栏入口属会话编排能力，本能力不画'],
        ],
      ),
      '',
      '本能力不渲染主区顶栏与设置弹窗——它们在别的能力里。',
      '',
    ].join('\n'),
  )
  adv('cap', 'C1')

  const decls = Array.from({ length: 20 }, (_, i) => `v${i}`)
  w(
    `${states.cap}/evidence/symbols-Fixture.md`,
    [
      '# 符号全集（来源：LSP code_resolve）',
      '',
      '**20 declarations discovered**',
      '',
      ...decls.map(
        (d) =>
          `- **${d}** (\`Constant\`) — \`ref_projects/pi-web/components/Fixture.tsx:${Number(d.slice(1)) + 1}:1\``,
      ),
      '',
    ].join('\n'),
  )
  w(
    `${states.cap}/symbol-map.md`,
    [
      '# 符号对账表',
      '',
      table(
        ['pi-web 符号', '行号', '归属切分', 'evo-pi 落点', '状态', '理由'],
        decls.map((d, i) => [
          `\`${d}\``,
          `L${i + 1}`,
          'F-01',
          i === 19 ? 'out-of-scope' : 'packages/web/src/cap-x/foo.ts',
          i === 19 ? 'drop' : 'pending',
          i === 19 ? '常量由 evo-pi 配置中心统一提供' : '',
        ]),
      ),
      '',
    ].join('\n'),
  )
  w(
    `${states.cap}/readlog.md`,
    [
      '# 阅读日志',
      '',
      '## 阅读日志',
      '',
      table(
        ['行区间', '读到什么'],
        [
          ['L1-L600', '常量导出（fake-src/Cap.tsx / Fixture.tsx 的结构）'],
          ['L601-L1200', '常量导出（packages/web/src/cap-x/foo.ts 的夹具）'],
          ['L1-L1200', '指令来源 state.mjs 与 helpers.ts 的调用点已读'],
        ],
      ),
    ].join('\n'),
  )
  w(
    `${states.cap}/ownership.md`,
    [
      '# 归属',
      '',
      '## 1. 归属区间表',
      '',
      table(
        ['行区间', '归属', '类型', '依据'],
        [
          ['L1-L600', 'D-U-01', 'feature', '会话选择与状态编排'],
          ['L601-L1100', 'D-B-01', 'skeleton', '布局容器，随骨架先立'],
          ['L1101-L1200', 'pi-web 常量表', 'drop', '由 evo-pi 配置中心统一提供'],
        ],
      ),
    ].join('\n'),
  )
  r = run(SURFACE, ['--root', root, '--run', states.cap, '--src', 'fake-src'])
  expect('C1 生成 surface.json', r, 0)
  const surface = JSON.parse(readFileSync(join(root, states.cap, 'surface.json'), 'utf8'))
  const c1 = () => run(CHECK, ['--root', root, '--run', states.cap, '--phase', 'C1'])
  // 符号全集的三种采集状态：手填 / 降级 / tsserver。
  // 这不是防君子：试点第一轮 TS7 环境下 175 条被手填成 "LSP"，C1 全绿、分母是假的。
  r = run(STATE, [
    'god',
    '--root',
    root,
    '--run',
    states.cap,
    '--id',
    'Fixture.tsx',
    '--symbols',
    '20',
    '--source',
    'LSP',
  ])
  expect('C1 手填 LSP 分母（无采集证据）', r, 0)
  expect('C1 手填分母不认：缺 meta 红', c1(), 1)
  w(
    `${states.cap}/evidence/symbols-Fixture.meta.json`,
    `${JSON.stringify({ file: 'fake-src/Fixture.tsx', mode: 'program', count: 20 }, null, 2)}\n`,
  )
  expect('C1 降级模式（program）红', c1(), 1)
  w(
    `${states.cap}/evidence/symbols-Fixture.meta.json`,
    `${JSON.stringify(
      {
        file: 'fake-src/Fixture.tsx',
        mode: 'tsserver',
        tsserverPath: '/usr/lib/node_modules/typescript/lib/tsserver.js',
        tsVersion: '5.9.3',
        project: 'fake-src/tsconfig.json',
        count: 20,
      },
      null,
      2,
    )}\n`,
  )
  r = run(STATE, ['god', '--root', root, '--run', states.cap, '--id', 'Fixture.tsx', '--from-meta'])
  expect('C1 由 meta 回填分母（tsserver 模式）', r, 0)
  const st = JSON.parse(readFileSync(join(root, states.cap, 'state.json'), 'utf8'))
  if (st.gods[0].symbols === 20) ok('C1 回填的条数等于 meta.count')
  else bad('C1 回填的条数等于 meta.count', `实际 ${st.gods[0].symbols}`)
  // 分母不再由人登记：enumerate-surface 已写 provenance（sha + 条数），C1 的门自己会复算
  const provPath = join(root, states.cap, 'evidence', 'provenance.json')
  if (existsSync(provPath) && readFileSync(provPath, 'utf8').includes('"surface"'))
    ok('C1 表面点分母已记账（provenance.json）')
  else bad('C1 表面点分母已记账', '缺 provenance.json')
  adv('cap', 'C2')

  w(
    `${states.cap}/contract-delta.md`,
    [
      '# 契约对齐',
      '',
      '## 对齐表',
      '',
      '无变更（本能力用到的命令与事件都已在 P1 冻结契约里，未新增语义）。',
      '',
      table(
        ['条目', '契约位置'],
        [
          ['sessions.context', 'contracts/wire.md#命令'],
          ['stream.chunk', 'contracts/wire.md#事件'],
        ],
      ),
    ].join('\n'),
  )
  // ── C2 负例（G-10 回归）：对齐表要真对齐、差异要有编号、源码端点要进契约 ──
  // 这三条是试点里唯一靠人眼发现的东西：PATCH /api/skills 被 GET 吞、content 子路由没登记。
  const delta = (rows, prose = '') =>
    ['# 契约对齐', '', '## 对齐表', '', table(['用法', '契约位置'], rows), prose].join('\n')
  const c2 = () => run(CHECK, ['--root', root, '--run', states.cap, '--phase', 'C2'])
  w(`${states.cap}/contract-delta.md`, delta([['sessions.context', 'contracts/wire.md#命令']]))
  expect('C2 对齐表少于 2 行红', c2(), 1)
  w(
    `${states.cap}/contract-delta.md`,
    delta([
      ['sessions.context', 'contracts/wire.md#命令'],
      ['stream.chunk', '待定'],
    ]),
  )
  expect('C2 对齐行既无指向也无编号红', c2(), 1)
  w(
    `${states.cap}/contract-delta.md`,
    delta(
      [
        ['sessions.context', 'contracts/wire.md#命令'],
        ['stream.chunk', 'contracts/wire.md#事件'],
      ],
      '\n对账发现 ❌ 两处缺登记，但还没开单。\n',
    ),
  )
  expect('C2 有差异却无 CHG 号红', c2(), 1)
  // 已知差异挂上编号即放行：门要求的是「有人负责」，不是「必须指向契约文件」
  w(
    `${states.cap}/contract-delta.md`,
    delta(
      [
        ['sessions.context', 'contracts/wire.md#命令'],
        ['stream.chunk', '**无**（⚠️ D-01 已开单）'],
      ],
      '\n变更单 CHG-001 已受理上述差异。\n',
    ),
  )
  expect('C2 差异挂 D-/CHG- 编号即绿', c2(), 0)
  w(
    `${states.cap}/contract-delta.md`,
    delta(
      [
        ['sessions.context', 'contracts/wire.md#命令'],
        ['stream.chunk', 'contracts/wire.md#事件'],
      ],
      '\n无变更：两处用法都已在 P1 冻结契约里。\n',
    ),
  )
  expect('C2 对齐表齐全绿', c2(), 0)

  // 源码里 fetch 的端点必须在契约里——把「人眼发现」变成机器发现
  w(
    'fake-src/Cap2.tsx',
    [
      'export async function load() {',
      "  return fetch('/api/cap', { method: 'POST' })",
      '}',
      '',
    ].join('\n'),
  )
  r = run(SURFACE, ['--root', root, '--run', states.cap, '--src', 'fake-src'])
  expect('C2 重新枚举（含 api 表面点）', r, 0)
  const apiPoints = JSON.parse(
    readFileSync(join(root, states.cap, 'surface.json'), 'utf8'),
  ).entries.filter((e) => e.kind === 'api')
  if (apiPoints.length === 1 && apiPoints[0].text === 'POST /api/cap') ok('C2 api 点带方法名')
  else bad('C2 api 点带方法名', JSON.stringify(apiPoints))
  expect('C2 源码端点未进契约红', c2(), 1)
  const wirePath = join(root, states.program, 'contracts/wire.md')
  writeFileSync(
    wirePath,
    readFileSync(wirePath, 'utf8').replace(
      '| sessions.list | cwd | SessionInfoDto[] | src:1 |',
      '| sessions.list | cwd | SessionInfoDto[] | src:1 |\n| POST /api/cap | { id } | { ok } | src:9 |',
    ),
  )
  expect('C2 补登记端点后绿', c2(), 0)
  // 收尾：把临时端点从契约里撤掉（否则后续 P1 的 stubPlan 会对着"没有桩的 POST /api/cap"红）
  writeFileSync(
    wirePath,
    readFileSync(wirePath, 'utf8').replace('\n| POST /api/cap | { id } | { ok } | src:9 |', ''),
  )
  // 收尾：删掉临时源码并重枚举，让后续阶段看到的表面点仍是原来那 6 个
  // （否则会污染后面「无命令/事件表面点 → 通过」与 CLAIM 计数的断言）
  rmSync(join(root, 'fake-src/Cap2.tsx'))
  r = run(SURFACE, ['--root', root, '--run', states.cap, '--src', 'fake-src'])
  expect('C2 收尾恢复表面基线', r, 0)

  {
    // 渲染边界：能力只迁自己的行，但屏幕上的 chrome 可能是别人的
    const charterPath = join(root, states.cap, 'CHARTER.md')
    const charterGood = readFileSync(charterPath, 'utf8')
    writeFileSync(charterPath, charterGood.replace('## 4. 渲染边界', '## 4. 界面边界'))
    r = run(CHECK, ['--root', root, '--run', states.cap, '--phase', 'C0'])
    expectContains('RB 缺「渲染边界」→ C0 红', r, '渲染边界')
    writeFileSync(charterPath, charterGood)
    r = run(CHECK, ['--root', root, '--run', states.cap, '--phase', 'C0'])
    expectNotContains('RB 补齐渲染边界 → C0 绿', r, 'C0:renderBoundary）\n')
  }

  adv('cap', 'C3')
  // C3 规格门：用户故事 + 多文件多行区间 + 交互形态 + 布局映射，且必须人签
  w(
    `${states.cap}/spec.md`,
    [
      '# 能力规格 — Cap',
      '',
      '## 用户故事',
      '',
      table(
        ['故事', '角色', '触发', '期望'],
        [
          ['U-01', '开发者', '从侧栏打开设置弹窗时', '看到会话列表并按最近排序'],
          ['U-02', '开发者', '点列表里的某一行时', '右侧详情显示该会话的上下文'],
          ['U-03', '开发者', '接口返回错误状态码时', '看到错误说明并可以点重试按钮'],
        ],
      ),
      '',
      '## 源码覆盖',
      '',
      table(
        ['文件', '行区间', '覆盖内容'],
        [
          ['ref_projects/pi-web/components/Fixture.tsx', 'L1-L600', '容器与列表'],
          ['ref_projects/pi-web/components/Fixture.tsx', 'L601-L1100', '详情与空态'],
          ['fake-src/helpers.ts', 'L1-L40', '排序与分组'],
        ],
      ),
      '',
      '## 交互与导航',
      '',
      '- 机制：dialog —— pi-web 在 AppShell 内以弹窗打开设置，迁移沿用，不走独立路由。',
      '- 证据：fake-src/Cap.tsx:3',
      '',
      '## 人工决策',
      '',
      table(
        ['决策项', '结论', '决策人'],
        [
          ['交互形态', 'dialog：沿用 pi-web 的弹窗，不做路由', '用户'],
          ['保真度基线', '同层级同信息量即可，不要求像素级', '用户'],
          ['本次不迁范围', 'Code mode 与信任对话框不做', '用户'],
          ['契约变更批准权', 'CHG 由用户批，本能力零改动', '用户'],
          ['R 级判定', 'R3（跨 3 文件）', '用户'],
          ['运行时/包边界', 'core 一个入口，无需 node-only', '用户'],
          ['新依赖', '不新增', '用户'],
          ['i18n 键策略', '沿用既有前缀', '用户'],
          ['预算', '单文件 400 行、props 6', '用户'],
          ['割接与回滚', '试点不割接', '用户'],
          ['检查点', 'C3/C4/C6 三次人工确认', '用户'],
        ],
      ),
      '',
      '## 与 pi-web 的布局映射',
      '',
      table(
        ['pi-web 区域', 'evo-pi 目标', '差异'],
        [
          ['左栏会话列表', 'C-02', '沿用'],
          ['右栏详情', 'C-03', '沿用'],
          ['空态提示', 'C-04', '沿用'],
        ],
      ),
      '',
    ].join('\n'),
  )
  expect('C3 规格未签字 → 拒绝推进', advCode('cap'), 1)
    {
      // 引用谁就得读过谁：spec.md 里点名一个 readlog 没记录的文件 → 红
      const specPath = join(root, states.cap, 'spec.md')
      const specGood = readFileSync(specPath, 'utf8')
      writeFileSync(specPath, `${specGood}\n顶栏入口见 ref_projects/pi-web/components/NotReadYet.tsx:42 的实现。\n`)
      r = run(CHECK, ['--root', root, '--run', states.cap, '--phase', 'C3'])
      expectContains('RLC 原型引用了没读过的文件 → C3 红', r, '没有阅读记录')
      writeFileSync(specPath, specGood)
      r = run(CHECK, ['--root', root, '--run', states.cap, '--phase', 'C3'])
      expectNotContains('RLC 恢复后不再报缺记录', r, '没有阅读记录')
    }

  expect(
    'C3 规格由 agent 代签 → 红',
    run(STATE, [
      'signoff',
      '--root',
      root,
      '--run',
      states.cap,
      '--artifact',
      'spec.md',
      '--by',
      'agent',
    '--saw',
    '已按门判据逐条看过',
    ]),
    0,
  )
  expect('C3 规格 agent 签字后仍拒绝', advCode('cap'), 1)
  // 换人复核的正规入口：先 unsign（原记录进 history），再由用户签——不允许直接覆盖
  expect(
    'UNSIGN 撤销 agent 的签字',
    run(STATE, ['unsign', '--root', root, '--run', states.cap, '--artifact', 'spec.md']),
    0,
  )
  expect(
    'REAUTH 换人改签在没有原签字人时按新增签字处理',
    run(STATE, ['signoff', '--root', root, '--run', states.cap, '--artifact', 'spec.md', '--by', 'agent', '--saw', 'x']),
    0,
  )
  expect(
    'REAUTH 改签换人 → 红（必须先 unsign）',
    run(STATE, ['signoff', '--reauth', '--root', root, '--run', states.cap, '--artifact', 'spec.md', '--by', 'user', '--saw', '逐条看过']),
    2,
  )
  expect(
    'REAUTH 交给正规流程撤回后由用户签',
    run(STATE, ['unsign', '--root', root, '--run', states.cap, '--artifact', 'spec.md']),
    0,
  )
  expect(
    'C3 规格由用户签',
    run(STATE, [
      'signoff',
      '--root',
      root,
      '--run',
      states.cap,
      '--artifact',
      'spec.md',
      '--by',
      'user',
    '--saw',
    '已按门判据逐条看过',
    ]),
    0,
  )


  const b01Evidence = 'fake-src/Cap.tsx:5'
  w(
    `${states.cap}/behaviors.md`,
    [
      '# 行为规格',
      '',
      '## 行为清单',
      '',
      table(
        ['ID', '行为', '触发', '预期', '证据', 'script_id', '表面点'],
        [['B-01', '打开', '点打开', '进入会话', b01Evidence, 's-01', surface.entries[0].id]],
      ),
    ].join('\n'),
  )
  w(
    `${states.cap}/harness/registry.json`,
    '{\n  "scripts": [\n    { "id": "s-01", "file": "e2e/b01.spec.ts", "kind": "auto" }\n  ]\n}\n',
  )
  w('e2e/b01.spec.ts', "// T-01: 打开会话（capture/assert 两侧脚本）\ntest('T-01', () => {})\n")
  w(
    `${states.cap}/specs/F-01.md`,
    [
      '# F-01',
      '',
      '### 端到端链路',
      '',
      '1. 触发 → fake-src/Cap.tsx:5',
      '',
      '### 决策表',
      '',
      table(['R', '证据', '测试 ID'], [['R-1', 'fake-src/Cap.tsx:5', 'T-01']]),
      '### 落点',
      '',
      table(['侧', '落点'], [['FE', 'packages/web/src/cap-x/foo.ts']]),
      '',
    ].join('\n'),
  )
  adv('cap', 'C4')

  // C4：设计产物（先造一份能过门的，再在下面做负例）
  const claimed = Object.fromEntries(surface.entries.map((e) => [e.id, 'D-B-01']))
  // web 切片骨架（webScaffold 门）：参照模板 + 一个真实 slice + 一个壳
  w('web/src/features/_template/README.md', body(120, '# 切片模板\n\n照抄本目录：use-<slice>.ts + <slice>-view.tsx + store/ 可选。\n'))
  // 入口页：必须是「渲染壳」，不许只 redirect（web-recal D-1；WEB-ENTRY 就是为它设的）
  w(
    'web/src/app/page.tsx',
    [
      "import { SessionSurface } from './session-surface'",
      '',
      'export default function RootPage(): React.JSX.Element {',
      '  return <SessionSurface />',
      '}',
      '',
    ].join('\n'),
  )
  w('web/src/features/cap-x/use-cap-x.ts', body(80, "export function useCapX() {\n  return { ready: true }\n}\n"))
  w('web/src/shell/app-shell.tsx', body(80, 'export function AppShell() {\n  return null\n}\n'))
  w('web/src/components/ui/button.tsx', body(80, 'export function Button() {\n  return null\n}\n'))

  const manifest = {
    god: 'ref_projects/pi-web/components/Fixture.tsx',
    elements: [
      {
        id: 'D-B-01',
        kind: 'component',
        name: 'CapView',
        layer: 'ui',
        landing: 'packages/web/src/cap-x/foo.ts',
        behaviors: ['B-01'],
        dependsOn: ['D-U-01'],
        symptom: b01Evidence,
        lines: 'L601-L1100',
      },
      {
        id: 'D-U-01',
        kind: 'use-case',
        name: 'openSession',
        layer: 'use-cases',
        landing: 'packages/core/src/cap-x/use-cases/open-session.ts',
        behaviors: [],
        dependsOn: [],
        lines: 'L1-L600',
      },
    ],
    states: [{ key: 'selectedSessionId', owner: 'D-B-01', readers: ['D-U-01'], mechanism: 'url' }],
    ports: [
      {
        id: 'D-P-01',
        name: 'SessionRepository',
        consumers: ['D-U-01'],
        methods: ['readContext(id)'],
      },
    ],
    protocols: [
      {
        id: 'D-X-01',
        kind: 'command',
        name: 'sessions.context',
        useCase: 'D-U-01',
        contractRef: 'contracts/wire.md#命令',
      },
    ],
    sequences: [
      { id: 'S-01', file: 'design/sequences/S-01.md', participants: ['D-B-01', 'D-U-01'] },
    ],
    patterns: [
      {
        id: 'PT-01',
        symptom: b01Evidence,
        chosen: '回调上提',
        rejected: ['事件总线'],
        costIfWrong: '小',
      },
    ],
    triStates: [{ boundary: 'session-context', loading: true, empty: true, error: true }],
    quality: {
      maxFileLines: 300,
      maxComplexity: 10,
      maxProps: 8,
      targets: ['packages/web/src/cap-x'],
      renderBudget: 2,
    },
    surfaces: claimed,
    excluded: {},
    // ── 实施图纸：组件树 / hook / store / 原则 / 图 ──
    // 这五项是「设计能不能拿来写代码」的分水岭：没有它们，实施阶段只能凭记忆拆。
    components: [
      {
        id: 'C-01',
        name: 'CapView',
        element: 'D-B-01',
        parent: null,
        file: 'packages/web/src/cap-x/foo.ts',
        props: [],
        sources: ['ref_projects/pi-web/components/Fixture.tsx#L601-L1100'],
      },
      {
        id: 'C-02',
        name: 'CapRow',
        element: 'D-B-01',
        parent: 'C-01',
        file: 'packages/web/src/cap-x/row.ts',
        props: ['label', 'onPick'],
        sources: ['ref_projects/pi-web/components/Fixture.tsx#L601-L1100'],
      },
      {
        id: 'C-03',
        name: 'CapEmpty',
        element: 'D-B-01',
        parent: 'C-01',
        file: 'packages/web/src/cap-x/empty.ts',
        props: [],
        sources: ['ref_projects/pi-web/components/Fixture.tsx#L601-L1100'],
      },
    ],
    hooks: [
      {
        id: 'H-01',
        name: 'useCapView',
        element: 'D-B-01',
        file: 'packages/web/src/cap-x/use-cap-view.ts',
        signature: 'useCapView(input: { id: string }): { state: string }',
        usedBy: ['C-01'],
        replaces: 'ref_projects/pi-web/components/Fixture.tsx#L601-L700',
      },
    ],
    stores: [
      {
        id: 'ST-01',
        name: 'capView',
        element: 'D-B-01',
        file: 'packages/web/src/cap-x/use-cap-view.ts',
        stateRefs: ['selectedSessionId'],
        persisted: [],
      },
    ],
  }
  // 夹具里的每个元素都要有 runtime：业务规则 server、UI 侧 client（runtimeFit 的判据）
  for (const e of manifest.elements) {
    const t = e.landing ?? e.file ?? ''
    e.runtime ??= t.includes('/ports/') ? 'both' : t.startsWith('packages/core/') ? 'server' : 'client'
  }
  for (const arr of [manifest.components, manifest.hooks, manifest.stores])
    for (const e of arr ?? []) e.runtime ??= 'client'
  w(`${states.cap}/design/manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`)
  w(
    `${states.cap}/design/interfaces.ts`,
    [
      '// 设计骨架：进 tsc，编译不过就是设计没定稿。',
      'export interface SessionRepository {',
      '  readContext(id: string, opts?: { tail?: number }): Promise<unknown>',
      '}',
      '',
      'export interface OpenSessionInput {',
      '  readonly id: string',
      '  readonly cwd: string',
      '}',
      '',
      'export interface CapViewProps {',
      '  readonly sessionId: string | null',
      '  readonly onOpen: (input: OpenSessionInput) => void',
      '}',
      '',
    ].join('\n'),
  )
  w(
    `${states.cap}/design/quality.md`,
    body(150, '单文件 300 行；复杂度 10；props 8。测试：域函数单测、组件 props 测、e2e 一条。\n'),
  )
  // 静态视图：UML 类图 + 型标注 + 依赖/订阅两种边（D13 查 id，D17 查型与边，D18 查实践落地）
  w(
    `${states.cap}/design/components.md`,
    body(
      400,
      [
        '# 静态视图 — 组件、hook、store',
        '',
        '> 图内 id 用 `C01` 这种短名：mermaid 的 classDiagram 不认连字符；真实 id 写在标签里。',
        '',
        '```mermaid',
        'classDiagram',
        '  class C01["C-01 CapView «container»"] {',
        '    <<container>>',
        '    +cwd: string',
        '  }',
        '  class C02["C-02 CapRow «presenter»"] {',
        '    <<presenter>>',
        '    +session: Session',
        '  }',
        '  class C03["C-03 CapEmpty «presenter»"]',
        '  class H01["H-01 useCapView «hook»"]',
        '  class ST01["ST-01 capView «store»"]',
        '  class U01["D-U-01 openSession «use-case»"]',
        '  C-01 --> C-02',
        '  C-01 --> C-03',
        '  C-01 --> H-01',
        '  H-01 ..> ST-01 : 订阅 selectedSessionId',
        '  H-01 --> D-U-01',
        '  D-U-01 ..> D-P-01 : 调用端口',
        '```',
        '',
        '## 区域 → 入口清单',
        '',
        '| 区域 | 入口 | 源 |',
        '|---|---|---|',
        '| 空态表单 | 名字 | fake-src/Cap.tsx:12 |',
        '| 空态表单 | 作用域 | fake-src/Cap.tsx:3 |',
        '| 空态表单 | 传输 | fake-src/Cap.tsx:4 |',
        '| 空态表单 | 命令 | fake-src/Cap.tsx:5 |',
        '| 空态表单 | 添加 | fake-src/Cap.tsx:6 |',
        '',
        '## 前端最佳实践',
        '',
        '| 实践 | 落在哪 | 做到什么程度 |',
        '|---|---|---|',
        '| 容器展示分离 | C-01 / C-02 | C-01 只取数与编排，C-02 只接收 session 与回调，不 import 任何 api |',
        '| 状态就近 | C-02 | 行内展开态留在 C-02 内部，不上提到 C-01，避免父层重渲染 |',
        '| 派生状态不落库 | H-01 | 分组与计数用 useMemo 从 skills 派生，不写进 store |',
        '| 渲染优化 | C-02 | 用 memo 包住行组件，回调用 useCallback 固定引用 |',
        '| 列表 key 稳定 | C-02 | key 用 session.id，不用数组下标 |',
        '| 可访问性 | C-03 | 空态有 role="status"，行可 Tab 聚焦并支持 Enter 打开 |',
        '| 三态齐备 | C-01 | loading / 空态 / 错误态各有一条渲染分支，错误态可重试 |',
        '| 并发竞态 | H-01 | 每次请求带 generation，回来时与当前 generation 不等就丢弃 |',
        '```',
        '',
      ].join('\n'),
    ),
  )
  // 动态视图：序列图（端口必须出现）+ 每个 store 一张状态图
  w(
    `${states.cap}/design/dynamics.md`,
    body(
      400,
      [
        '# 动态视图 — 接口怎么被调用、状态怎么流转',
        '',
        '```mermaid',
        'sequenceDiagram',
        '  participant U as C-01 CapView',
        '  participant H as H-01 useCapView',
        '  participant UC as D-U-01 openSession',
        '  participant P as D-P-01 SessionRepository',
        '  U->>H: 挂载（cwd）',
        '  H->>UC: open(id)',
        '  UC->>P: readContext(id)',
        '  alt 成功',
        '    P-->>UC: 上下文',
        '    UC-->>H: ok(data)',
        '    H-->>U: 渲染 C-02',
        '  else 失败',
        '    P-->>UC: 抛错',
        '    UC-->>H: err(code)',
        '    H-->>U: 渲染错误态（可重试）',
        '  end',
        '```',
        '',
        '```mermaid',
        'stateDiagram-v2',
        '  [*] --> idle',
        '  idle --> loading: 选中变化',
        '  loading --> ready: ok',
        '  loading --> failed: err',
        '  failed --> loading: 重试',
        '  ready --> idle: 清空选中',
        '```',
        '',
      ].join('\n'),
    ),
  )
  w(
    `${states.cap}/design/sequences/S-01.md`,
    [
      '# 时序 S-01',
      '',
      '```mermaid',
      'sequenceDiagram',
      '  participant B as D-B-01',
      '  participant U as D-U-01',
      '  B->>U: open(id)',
      '  U-->>B: ok',
      '```',
      '',
    ].join('\n'),
  )
  // D19：hook / store 各自必须有一句话职责（列表形式，用户审核时逐行看）
  const compPath = join(root, states.cap, 'design/components.md')
  writeFileSync(
    compPath,
    `${readFileSync(compPath, 'utf8')}\n${table(
      ['ID', '职责（一句话，≥10 字）', '签名', '替换源码', '被谁使用', '里面有什么'],
      [
        [
          'H-01',
          '把列表、选中、动作串起来并丢弃过期响应',
          '`useCapView(i): X`',
          '`Fixture.tsx#L601-L700`',
          'C-01',
          'D-U-01',
        ],
      ],
    )}\n${table(
      ['ID', '职责（一句话，≥10 字）', 'state', '持有者', '谁订阅', '生命周期'],
      [['ST-01', '本能力可写状态的唯一落点', '`selected`', 'C-01', 'C-02', '挂载到卸载']],
    )}`,
  )
  // 用户 review 用的 ASCII 原型：主屏 + 空态各一块
  const ascii = (lines) => ['```text', ...lines, '```'].join('\n')
  w(
    `${states.cap}/design/ui.md`,
    [
      '# UI 原型 — Cap',
      '',
      '## 主屏',
      '',
      ascii([
        '┌──────────────┬──────────────────────────────┐',
        '│ 列表（工具栏）│ 详情（字段 / 状态 / 操作）    │',
        '│ C-02         │ C-03                          │',
        '│  · 行 1      │  名称：…                      │',
        '│  · 行 2      │  状态：启用                   │',
        '└──────────────┴──────────────────────────────┘',
      ]),
      '',
      '## 空态',
      '',
      ascii([
        '┌──────────────────────────────────────────────┐',
        '│ 空态：还没有任何条目（列表为空）              │',
        '│ 配置路径：/x/mcp.json                         │',
        '│ 表单：[ 名字 ][ 作用域 ][ 传输 ][ 命令 ][ 添加 ] │',
        '│ 空态提示 C-04                                 │',
        '└──────────────────────────────────────────────┘',
      ]),
      '',
      '## 交互态',
      '',
      table(
        ['态', '触发', '表现'],
        [
          ['loading', '首次挂载', '骨架行 + 不可点'],
          ['error', '接口失败', '错误条 + 重试按钮'],
          ['empty', '零条目', '空态卡片 + 添加表单'],
        ],
      ),
      '',
    ].join('\n'),
  )
  r = run(DESIGN, [
    '--root',
    root,
    '--run',
    states.cap,
    '--program',
    states.program,
    '--design-only',
  ])
  expect('C4 设计门全过', r, 0)
  // ── 实施图纸门的负例（D11–D18）：每道门都要能被真缺陷打红 ──
  const mPath = join(root, states.cap, 'design/manifest.json')
  const goodManifest = readFileSync(mPath, 'utf8')
  const mutate = (fn) => {
    const m = JSON.parse(goodManifest)
    fn(m)
    writeFileSync(mPath, `${JSON.stringify(m, null, 2)}\n`)
    return run(DESIGN, [
      '--root',
      root,
      '--run',
      states.cap,
      '--program',
      states.program,
      '--design-only',
    ])
  }
  expect(
    'D11 组件 parent 指向不存在的组件 → 红',
    mutate((m) => {
      m.components[1].parent = 'C-99'
    }),
    1,
  )
  expect(
    'D11 两个根 → 红',
    mutate((m) => {
      m.components[2].parent = null
    }),
    1,
  )
  expect(
    'D12 hook 被未声明组件使用 → 红',
    mutate((m) => {
      m.hooks[0].usedBy = ['C-77']
    }),
    1,
  )
  expect(
    'D12 store 持有别人的状态 → 红',
    mutate((m) => {
      m.stores[0].element = 'D-U-01'
    }),
    1,
  )
  const dPath = join(root, states.cap, 'design/components.md')
  const goodDiag = readFileSync(dPath, 'utf8')
  writeFileSync(dPath, goodDiag.replace('class C-03["CapEmpty"]', 'class C-99["CapEmpty"]'))
  expect(
    'D13 图引用未声明的 id → 红',
    run(DESIGN, [
      '--root',
      root,
      '--run',
      states.cap,
      '--program',
      states.program,
      '--design-only',
    ]),
    1,
  )
  writeFileSync(dPath, goodDiag)
  expect(
    'D14 元素出处与 ownership 不一致 → 红',
    mutate((m) => {
      m.elements[0].lines = 'L600-L1100'
    }),
    1,
  )
  writeFileSync(mPath, goodManifest)
  const dynPath = join(root, states.cap, 'design/dynamics.md')
  const goodDyn = readFileSync(dynPath, 'utf8')
  writeFileSync(dynPath, goodDyn.replace('D-P-01', 'D-P-99'))
  expect(
    'D17 序列图里没有端口出现 → 红',
    run(DESIGN, [
      '--root',
      root,
      '--run',
      states.cap,
      '--program',
      states.program,
      '--design-only',
    ]),
    1,
  )
  writeFileSync(dynPath, goodDyn)
  // 标签里的 «container» 与类体里的 <<container>> 都要去掉，否则型还在
  writeFileSync(dPath, goodDiag.replace(/[«<]{1,2}container[»>]{1,2}/g, ''))
  expect(
    'D17 组件没标 container/presenter → 红',
    run(DESIGN, [
      '--root',
      root,
      '--run',
      states.cap,
      '--program',
      states.program,
      '--design-only',
    ]),
    1,
  )
  // 把 store 的 id 改掉：型标注还在，但已不是声明的那个 store
  writeFileSync(dPath, goodDiag.replace(/ST-01/g, 'ST-77'))
  expect(
    'D17 store 没标 store 型 → 红',
    run(DESIGN, [
      '--root',
      root,
      '--run',
      states.cap,
      '--program',
      states.program,
      '--design-only',
    ]),
    1,
  )
  writeFileSync(dPath, goodDiag.replace(/^.*\.\.>.*$/gm, ''))
  expect(
    'D17 静态图没有订阅边 → 红',
    run(DESIGN, [
      '--root',
      root,
      '--run',
      states.cap,
      '--program',
      states.program,
      '--design-only',
    ]),
    1,
  )
  // 判据认的是表头（实践 / 落点），不是小节标题——所以负例要改表头，光改标题不算
  writeFileSync(
    dPath,
    goodDiag.replace('| 实践 | 落在哪 | 做到什么程度 |', '| 类别 | 说明 | 备注 |'),
  )
  expect(
    'D18 没有最佳实践表 → 红',
    run(DESIGN, [
      '--root',
      root,
      '--run',
      states.cap,
      '--program',
      states.program,
      '--design-only',
    ]),
    1,
  )
  writeFileSync(
    dPath,
    goodDiag.replace(
      '| 渲染优化 | C-02 | 用 memo 包住行组件，回调用 useCallback 固定引用 |',
      '| 渲染优化 | C-02 | 注意性能 |',
    ),
  )
  expect(
    'D18 实践写得没法施工（<10 字且无机制） → 红',
    run(DESIGN, [
      '--root',
      root,
      '--run',
      states.cap,
      '--program',
      states.program,
      '--design-only',
    ]),
    1,
  )
  writeFileSync(dPath, goodDiag.replace('| 可访问性 | C-03 |', '| 可访问性 | C-88 |'))
  expect(
    'D18 实践落点不是已声明元素 → 红',
    run(DESIGN, [
      '--root',
      root,
      '--run',
      states.cap,
      '--program',
      states.program,
      '--design-only',
    ]),
    1,
  )
  writeFileSync(dPath, goodDiag)
  writeFileSync(dPath, goodDiag)
  writeFileSync(dynPath, goodDyn.replace('stateDiagram-v2', 'flowchart TD'))
  expect(
    'D17 缺状态图 → 红',
    run(DESIGN, [
      '--root',
      root,
      '--run',
      states.cap,
      '--program',
      states.program,
      '--design-only',
    ]),
    1,
  )
  writeFileSync(dynPath, goodDyn)
  expect(
    'D17 恢复后设计门再绿',
    run(DESIGN, [
      '--root',
      root,
      '--run',
      states.cap,
      '--program',
      states.program,
      '--design-only',
    ]),
    0,
  )
  // D16：散文里的 path:line 必须落到真实行（挡住"设计文档里写假出处"）
  writeFileSync(mPath, goodManifest)
  const decompPath = join(root, states.cap, 'design/quality.md')
  const goodDecomp = readFileSync(decompPath, 'utf8')
  writeFileSync(decompPath, `${goodDecomp}\n证据见 ref_projects/pi-web/components/Nope.tsx:12\n`)
  expect(
    'D16 散文引用了不存在的文件 → 红',
    run(DESIGN, [
      '--root',
      root,
      '--run',
      states.cap,
      '--program',
      states.program,
      '--design-only',
    ]),
    1,
  )
  writeFileSync(
    decompPath,
    `${goodDecomp}\n证据见 ref_projects/pi-web/components/Fixture.tsx:99999\n`,
  )
  expect(
    'D16 散文行号越界 → 红',
    run(DESIGN, [
      '--root',
      root,
      '--run',
      states.cap,
      '--program',
      states.program,
      '--design-only',
    ]),
    1,
  )
  writeFileSync(
    decompPath,
    `${goodDecomp}\n证据见 ref_projects/pi-web/components/Fixture.tsx:600\n`,
  )
  expect(
    'D16 真实锚点 → 绿',
    run(DESIGN, [
      '--root',
      root,
      '--run',
      states.cap,
      '--program',
      states.program,
      '--design-only',
    ]),
    0,
  )
  writeFileSync(decompPath, goodDecomp)
  writeFileSync(mPath, goodManifest)
  r = run(DESIGN, [
    '--root',
    root,
    '--run',
    states.cap,
    '--program',
    states.program,
    '--design-only',
  ])
  expect('恢复后设计门再绿', r, 0)
  r = run(STATE, [
    'signoff',
    '--reauth',
    '--root',
    root,
    '--run',
    states.cap,
    '--artifact',
    'design/manifest.json',
    '--by',
    'user',
    '--saw',
    '组件树与状态归属已看',
  ])
  expect('C4 签设计', r, 0)
  for (const art of ['design/components.md', 'design/ui.md']) {
    expect(
      `C4 签 ${art}`,
      run(STATE, [
        'signoff',
        '--root',
        root,
        '--run',
        states.cap,
        '--artifact',
        art,
        '--by',
        'user',
        '--saw',
        '原型与职责列已看',
      ]),
      0,
    )
  }
  w(
    `${states.cap}/plans/C-fixture.md`,
    [
      '# 计划 — fixture',
      '',
      table(
        ['任务', '目的', '设计元素', '行为', '验收命令', '测试 ID'],
        [
          ['T-01', '拉取会话上下文', 'D-U-01', 'B-01', '`node -e "process.exit(0)"`', 'T-01'],
          // 观察门只认"会画出界面"的任务（元素含 C-/H-/ST-），这也是 C-A 那类基础设施 run 能免观察的原因
          ['T-02', '会话行点击切换', 'C-01 D-B-01', 'B-01', '`node -e "process.exit(0)"`', 'T-01'],
        ],
      ),
      '',
    ].join('\n'),
  )
  // 实施前的观察（C5 observations 门）：T-01 已 done 不追溯，只需 T-02
  w(
    `${states.cap}/observations/T-02.md`,
    [
      '# T-02 会话行点击切换 — 观察',
      '',
      '## 看到什么',
      'pi-web `components/SessionTree.tsx:412` 行是 button，名称就是会话标题；',
      '点击后右侧换内容，选中态用 aria-current 表达。',
      '',
      '## 差在哪',
      '我们的行是 div + onClick，没有 aria-current，读屏看不出当前选中。',
      '',
      '## 决定',
      '改成 button + aria-current，选中态不靠背景色。',
      '',
    ].join('\n'),
  )
  adv('cap', 'C5')

  // C5：任务级执行 + 机器证据 + 双轴审查
  w(
    'packages/core/src/cap-x/use-cases/open-session.ts',
    ['// @design D-U-01', 'export const openSession = 1', ''].join('\n'),
  )
  w(
    'packages/web/src/cap-x/foo.ts',
    ['// @design D-B-01', '// @design D-U-01', 'export const foo = 1', ''].join('\n'),
  )
  // 12 项固定清单：门要求每项 pass/fix/na，fix 必须带 文件:行
  const reviewRows = [
    ['单一职责', 'pass', '`packages/web/src/cap-x/foo.ts:1` 只做展示'],
    ['文件体量', 'pass', '`packages/web/src/cap-x/foo.ts:3`（阈值 400）'],
    ['函数体量', 'pass', '`packages/core/src/cap-x/use-cases/open-session.ts:2`（阈值 60）'],
    ['嵌套深度', 'pass', '最深 2 层'],
    ['参数与 props', 'pass', '最多 3 个'],
    ['依赖方向', 'pass', '只 import `@evo-pi/core`'],
    ['错误处理', 'pass', '用例返回结果对象'],
    ['命名与注释', 'pass', 'kebab-case + 为什么注释'],
    ['测试覆盖', 'pass', 'core 侧 3 个用例'],
    ['可访问性与交互态', 'na', '本 fixture 无交互元素，涉及不到'],
    ['副作用与竞态', 'pass', '无 fetch'],
    ['死代码与重复', 'pass', '无重复'],
  ]
  w(
    `${states.cap}/review.md`,
    [
      '# review — fixture',
      '',
      '## 检查清单',
      '',
      '| 检查项 | 结论 | 证据 |',
      '|---|---|---|',
      ...reviewRows.map((r) => `| ${r[0]} | ${r[1]} | ${r[2]} |`),
      '',
      '## 结论',
      '',
      '以上 0 项 fix；未关闭项为 0。',
      '',
    ].join('\n'),
  )
  r = run(STATE, ['task', '--root', root, '--run', states.cap, '--id', 'T-01', '--status', 'done'])
  expect('C5 任务台账记账', r, 0)
  // webScaffold：组件落在允许根之外（components/ 不是 components/ui）→ 红
  // 注意 w() 是 root 相对路径，传绝对路径会写到 root 下的 /tmp/... 去（第一次这么写，红是红了，
  // 但红的原因是别的门，且清理时 ENOENT）
  const strayRel = 'web/src/components/stray-panel.tsx'
  w(strayRel, body(80, 'export function StrayPanel() {\n  return null\n}\n'))
  r = run(CHECK, ['--root', root, '--run', states.cap, '--phase', 'C5'])
  expect('WEB 组件落在 src/components 下 → C5 红', r, 1)
  expectContains('WEB 组件落在 src/components 下 → 报出 WEB-PLACEMENT', r, 'WEB-PLACEMENT')
  rmSync(join(root, strayRel))
  // 这里 C5 的 gates/C5.json 还没记（脚本后面才记），所以只能断言"webScaffold 这一段全绿"，
  // 不能断言整阶段 exit 0——那是把"别的门还没跑"误判成"这个门有问题"
  r = run(CHECK, ['--root', root, '--run', states.cap, '--phase', 'C5'])
  // 只判"失败文案"：绿的时候同一行的 label（C5:webScaffold:WEB-PLACEMENT）也会打印，
  // 拿 label 当 needle 会让这条断言永远红
  expectNotContains('WEB 恢复后 webScaffold 全绿', r, '个组件不在允许的落点')

  r = run(VERIFY, [
    '--root',
    root,
    '--run',
    states.cap,
    '--id',
    'C5',
    '--from-plan',
    'plans/C-fixture.md',
  ])
  expect('C5 record-verification 真跑命令', r, 0)
  r = run(DESIGN, ['--root', root, '--run', states.cap, '--program', states.program])
  expect('C5 设计+质量+漂移全过', r, 0)
  r = run(TRACE, ['--root', root, '--run', states.cap])
  expect('C5 四向追踪闭合', r, 0)
  w(
    `${states.cap}/integration.md`,
    [
      '# 联调记录 — fixture',
      '',
      '## 1. 替换表',
      '',
      table(['命令', '桩', '真实现', '联调证据'], [['（无 HTTP 表面点）', '—', '—', 'T-02']]),
      '',
      '## 2. 联调中发现的问题',
      '',
      table(['现象', '根因', '处置', '是否回写契约'], [['无', '—', '—', '否']]),
      '',
      '## 3. 未联调的部分',
      '',
      table(
        ['命令/路径', '为什么不联调', '谁在什么时候补'],
        [['—', '本能力没有 HTTP 表面点', '—']],
      ),
      '',
    ].join('\n'),
  )
  r = run(VOLUME, ['--root', root, '--run', states.cap])
  expect('C5 体量预算合规', r, 0)
  adv('cap', 'C6')

  // C6 起就要求验收阶梯存在（mode=pre 只放行 L6 pending，不放行"没有表格"）。
  const writeAcceptance = (l6Result, signer) =>
    w(
      `${states.cap}/acceptance.md`,
      [
        '# 验收阶梯 — fixture',
        '',
        '## 1. 阶梯',
        '',
        table(
          ['层', '命令', '结果', '证据', '签字'],
          [
            ['L1 算法规格', '`node -e "process.exit(0)"`', 'pass', 'T-01', '—'],
            ['L2 架构契约', '`node -e "process.exit(0)"`', 'pass', 'T-02', '—'],
            ['L3 组件/交互', '`node -e "process.exit(0)"`', 'pass', 'e2e/cap-x/view.spec.ts', '—'],
            ['L4 行为对账', '`node -e "process.exit(0)"`', 'pass', 'gates/C6.json', '—'],
            [
              'L5 联调',
              '`node -e "process.exit(0)"`',
              'skipped',
              '本能力没有 HTTP 表面点，联调层无对象',
              '—',
            ],
            [
              'L6 人工验收',
              '用户按 behaviors.md 逐条点',
              l6Result,
              'manual:fixture-acceptance',
              signer,
            ],
          ],
        ),
        '',
        '## 2. 每层在挡什么',
        '',
        table(
          ['层', '挡的错误'],
          [
            ['L1', '算法规格实现错'],
            ['L6', '观感与手感'],
          ],
        ),
        '',
      ].join('\n'),
    )

  // C6
  w(
    `${states.cap}/parity.md`,
    [
      '# 行为对账 — fixture 能力',
      '',
      '## 行为对账结果',
      '',
      `> 分母：1 条 B- 行为（来源 behaviors.md sha ${sha8(join(root, states.cap, 'behaviors.md'))}）——手填数字不认。`,
      '',
      '同一套脚本对 30141 采集、对 30041 断言，逐条比对 wire 调用 / DOM+a11y / 截图。',
      '',
      '## 差异分类',
      '',
      // 分类是闭集：一致 / 差异（…） / blocked（原因+解除条件）。写 todo 等于没对账，门不认
      table(
        ['ID', '分类', '理由'],
        [
          ['B-01', '一致（30041 已断言）', '会话标题渲染一致'],
          // 导航/布局维度必须有：交互形态（弹窗 vs 路由）是很容易走样的地方
          ['nav', '一致（dialog）', '设置从侧栏弹窗打开，与 pi-web 布局一致'],
          // 保真快照里 evo-pi 少这条：pi-web 行名带连接态，我们只写名字
          ['D-02', '差异（保真）', '行名缺连接态：pi-web 写「A：已连接」，我们写「A」'],
        ],
      ),
      '',
      '未分类差异：0',
      '',
      '## 保真缺口组',
      '',
      // 覆盖率只说明"差多少"，这张表说明"打算怎么办"——P7 的主判据在这一张表上
      table(
        ['缺口组', '条数', '处置', '依据'],
        [
          ['行内连接态', '1', 'fix', 'pi-web 行名带连接态，C5 已补 aria-label'],
          ['项目选择器', '0', 'done', '本能力不涉及项目切换，无该组'],
        ],
      ),
      '',
      '## 渲染预算',
      '',
      '会话切换 1 次渲染（上限 2）；流式更新 1 次/帧（上限 1）。',
      '',
    ].join('\n'),
  )
  r = run(VERIFY, [
    '--root',
    root,
    '--run',
    states.cap,
    '--id',
    'C6',
    '--cmd',
    'node -e "process.exit(0)"',
  ])
  expect('C6 record-verification', r, 0)
  writeAcceptance('pending', '—')
  // 分母的 sha 必须与"当前"来源文件一致：fixture 在 C3/C5 之后又动过 behaviors.md，
  // 所以这里按实际重新固定一次（真实项目里这意味着"台账重算"，门就是这么要求的）
  // P7 保真快照：两侧各拍一份，evo-pi 少一条（"A：已连接"），已在差异表登记
  const mkFid = (side, anchors) =>
    w(
      `${states.cap}/harness/snapshot/fidelity/cap.${side}.json`,
      JSON.stringify({ source: side, flow: 'cap', anchors }, null, 2),
    )
  const sharedAnchors = [
    { role: 'button', name: '刷新', aria: null },
    { role: 'switch', name: '开关 A', aria: 'checked' },
    { role: 'heading', name: 'MCP 服务器', aria: null },
  ]
  mkFid('piweb', [...sharedAnchors, { role: 'button', name: 'A：已连接', aria: null }])
  mkFid('evopi', sharedAnchors)
  // 同一份 parity.md 在夹具里会被多次改动后重签：改签必须带 --reauth（原签字人仍是「用户（fixture）」）
  const signParity = () =>
    run(STATE, [
      'signoff',
      '--reauth',
      '--root',
      root,
      '--run',
      states.cap,
      '--artifact',
      'parity.md',
      '--by',
      '用户（fixture）',
      '--saw',
      '对账表 + 保真缺口 D-02',
    ])
  signParity()
  refreshParitySha()
  r = (refreshParitySha(), run(CHECK, ['--root', root, '--run', states.cap, '--phase', 'C6']))
  expect('C6 验收阶梯 L1–L4 达标（L6 待签）', r, 0)
  // 负例：保真缺口没在差异表登记（"没提过"）→ 红；补回去 → 绿
  const parityText = readFileSync(join(root, states.cap, 'parity.md'), 'utf8')
  writeFileSync(
    join(root, states.cap, 'parity.md'),
    parityText.replace(/\| D-02 \| 差异（保真） \|[^\n]*\n/, ''),
  )
  signParity()
  r = (refreshParitySha(), run(CHECK, ['--root', root, '--run', states.cap, '--phase', 'C6']))
  expect('FID 未登记的 pi-web 元素 → C6 红', r, 1)
  // 负例：没有「保真缺口组」表 → 红（覆盖率不是判据的全部）
  writeFileSync(join(root, states.cap, 'parity.md'), parityText.replace(/## 保真缺口组[\s\S]*?\n## 渲染预算/, '## 渲染预算'))
  signParity()
  r = (refreshParitySha(), run(CHECK, ['--root', root, '--run', states.cap, '--phase', 'C6']))
  expect('FID 缺缺口组表 → C6 红', r, 1)
  // 负例：处置写成"待定" → 红（闭集 fix/done/砍单/命名/blocked/差异）
  writeFileSync(
    join(root, states.cap, 'parity.md'),
    parityText.replace('| 行内连接态 | 1 | fix |', '| 行内连接态 | 1 | 待定 |'),
  )
  signParity()
  r = (refreshParitySha(), run(CHECK, ['--root', root, '--run', states.cap, '--phase', 'C6']))
  expect('FID 处置不在闭集 → C6 红', r, 1)
  writeFileSync(join(root, states.cap, 'parity.md'), parityText)
  signParity()
  writeFileSync(join(root, states.cap, 'parity.md'), parityText)
  signParity()

  // 负例：把分类改成 todo（等价的"未对账"）必须红——否则 parity 只是核对表上有几行字
  const parityPath = join(root, states.cap, 'parity.md')
  if (!existsSync(parityPath)) bad('parity fixture missing', parityPath)
  writeFileSync(
    parityPath,
    readFileSync(parityPath, 'utf8').replace('一致（30041 已断言）', 'todo'),
  )
  r = (refreshParitySha(), run(CHECK, ['--root', root, '--run', states.cap, '--phase', 'C6']))
  expect('C6 分类写 todo 时拒绝（闭集）', r, 1, 1)
  writeFileSync(
    parityPath,
    readFileSync(parityPath, 'utf8').replace('todo', '一致（30041 已断言）'),
  )
  writeAcceptance('pass', '用户')
  adv('cap', 'C7')

  // C7
  w(
    `${states.cap}/retro.md`,
    [
      '# 复盘 — fixture 能力',
      '',
      '## 教训与落地',
      '',
      '每条教训必须有去处：规则文件 / 契约变更单 / issue。留在对话里的不算。',
      '',
      table(
        ['教训', '落地'],
        [
          ['设计门要先有表面枚举，否则覆盖率自证', 'references/design.md'],
          ['route 顶层做 composition root 会导致测试不可注入', 'arch/rules.json forbiddenEdges'],
        ],
      ),
    ].join('\n'),
  )
  w(
    '.evo/migration/GODS.md',
    [
      '# god 全景',
      '',
      table(
        ['#', 'god', '路径', '行数', '依赖 god', 'R 级', '状态', '迁移目录'],
        [
          [
            '1',
            '`Fixture.tsx`',
            '`components/Fixture.tsx`',
            '1200',
            '—',
            'R3',
            '已完成',
            `\`${states.cap}\``,
          ],
        ],
      ),
    ].join('\n'),
  )
  adv('cap', null)
  r = run(CHECK, ['--root', root, '--run', states.cap, '--all'])
  expect('Capability 全阶段门 --all 全绿', r, 0)

  // ═════════ 5) 负例：设计门必须真的能拦住东西 ═════════
  const manifestPath = join(root, states.cap, 'design/manifest.json')
  const good = readFileSync(manifestPath, 'utf8')

  const broken1 = JSON.parse(good)
  broken1.surfaces = {}
  writeFileSync(manifestPath, JSON.stringify(broken1, null, 2))
  r = run(DESIGN, ['--root', root, '--run', states.cap, '--program', states.program])
  expect('D2 表面未认领 → 红', r, 1)

  const broken2 = JSON.parse(good)
  broken2.states.push({ key: 'selectedSessionId', owner: 'D-B-01', mechanism: 'url' })
  writeFileSync(manifestPath, JSON.stringify(broken2, null, 2))
  r = run(DESIGN, ['--root', root, '--run', states.cap, '--program', states.program])
  expect('D3 状态重复 owner → 红', r, 1)

  const broken3 = JSON.parse(good)
  broken3.patterns[0].symptom = '看起来不好'
  writeFileSync(manifestPath, JSON.stringify(broken3, null, 2))
  r = run(DESIGN, ['--root', root, '--run', states.cap, '--program', states.program])
  expect('D8 模式无观察症状 → 红', r, 1)

  const broken4 = JSON.parse(good)
  broken4.quality.maxFileLines = 0
  writeFileSync(manifestPath, JSON.stringify(broken4, null, 2))
  r = run(DESIGN, ['--root', root, '--run', states.cap, '--program', states.program])
  expect('D9 预算无数字 → 红', r, 1)

  writeFileSync(manifestPath, good)
  const ghostFile = join(root, 'packages/web/src/cap-x/bar.ts')
  writeFileSync(ghostFile, '// @design D-Z-99\nexport const bar = 1\n')
  r = run(DESIGN, ['--root', root, '--run', states.cap, '--program', states.program])
  expect('DRIFT 隐性设计 → 红', r, 1)
  rmSync(ghostFile)

  // 行为 ↔ 脚本绑定：孤儿脚本必须被抓到
  const regPath = join(root, states.cap, 'harness/registry.json')
  const regGood = readFileSync(regPath, 'utf8')
  writeFileSync(regPath, '{\n  "scripts": [\n    { "id": "s-01" },\n    { "id": "s-99" }\n  ]\n}\n')
  r = run(CHECK, ['--root', root, '--run', states.cap, '--phase', 'C3'])
  expect('BIND 孤儿脚本 → 红', r, 1)
  writeFileSync(regPath, regGood)

  // 质量预算：超长文件必须被抓到
  const longFile = join(root, 'packages/web/src/cap-x/long.ts')
  writeFileSync(
    longFile,
    `${Array.from({ length: 320 }, (_, i) => `export const l${i} = ${i}`).join('\n')}\n`,
  )
  r = run(DESIGN, ['--root', root, '--run', states.cap, '--program', states.program])
  expect('Q1 超行数 → 红', r, 1)
  rmSync(longFile)

  // 未知参数必须 exit 2（v1 的静默成功缺陷）
  r = run(CHECK, ['--root', root, '--run', states.cap, '--dir', 'x'])
  expect('check-phase 未知参数 → exit 2', r, 2)
  r = run(STATE, ['statsu', '--root', root, '--run', states.cap])
  expect('state 未知子命令 → exit 2', r, 2)
  r = run(DESIGN, ['--root', root, '--run', states.cap, '--bogus'])
  expect('design-gate 未知参数 → exit 2', r, 2)
  r = run(CHECK, ['--root', root, '--run', states.cap, '--phase', 'P0'])
  expect('跨作用域阶段 → exit 2', r, 2)

  // ═════════ 5.5) 执行脊柱的负例（门必须真拦得住）═════════
  const plansPath = join(root, states.cap, 'plans/C-fixture.md')
  const plansGood = readFileSync(plansPath, 'utf8')
  rmSync(plansPath)
  r = run(CHECK, ['--root', root, '--run', states.cap, '--phase', 'C4'])
  expect('PLAN 缺计划 → C4 红', r, 1)
  writeFileSync(plansPath, plansGood)

  const t2Line = plansGood.split('\n').find((l) => l.includes('| T-02 |'))
  writeFileSync(plansPath, plansGood.replace(t2Line, ''))
  r = run(TRACE, ['--root', root, '--run', states.cap])
  expect('TRACE 设计元素无人实现 → 红', r, 1)
  writeFileSync(plansPath, plansGood)

  const reviewPath = join(root, states.cap, 'review.md')
  const reviewGood = readFileSync(reviewPath, 'utf8')

  // 清单缺项 → 红（12 项是固定的，少一项等于没评这一项）
  writeFileSync(reviewPath, reviewGood.replace(/^\| 死代码与重复 \|.*$/m, ''))
  r = run(CHECK, ['--root', root, '--run', states.cap, '--phase', 'C5'])
  expect('REVIEW 缺「死代码与重复」→ C5 红', r, 1)
  writeFileSync(reviewPath, reviewGood)

  // 结论词非法 → 红
  writeFileSync(reviewPath, reviewGood.replace('| 文件体量 | pass |', '| 文件体量 | ok |'))
  r = run(CHECK, ['--root', root, '--run', states.cap, '--phase', 'C5'])
  expect('REVIEW 结论写 ok → C5 红', r, 1)
  writeFileSync(reviewPath, reviewGood)

  // fix 不给 文件:行 → 红（否则"我修了"就是一句话）
  writeFileSync(
    reviewPath,
    reviewGood.replace('| 死代码与重复 | pass | 无重复 |', '| 死代码与重复 | fix | 已清理 |'),
  )
  r = run(CHECK, ['--root', root, '--run', states.cap, '--phase', 'C5'])
  expect('REVIEW fix 无 file:line → C5 红', r, 1)
  writeFileSync(reviewPath, reviewGood)

  // conventions：layerPaths 必须指向真实存在的目录（"想象中的层"要红）
  const rulesPath = join(root, states.program, 'arch/rules.json')
  const rulesGood = readFileSync(rulesPath, 'utf8')
  const rulesBad = JSON.parse(rulesGood)
  rulesBad.layerPaths.domain = 'packages/core/src/nope/domain/**'
  writeFileSync(rulesPath, JSON.stringify(rulesBad, null, 2))
  r = run(CHECK, ['--root', root, '--run', states.program, '--phase', 'P2.5'])
  expect('CONV layerPaths 指向不存在的目录 → P2.5 红', r, 1)
  writeFileSync(rulesPath, rulesGood)
  r = run(CHECK, ['--root', root, '--run', states.program, '--phase', 'P2.5'])
  expect('CONV 恢复后 P2.5 绿', r, 0)

  // placement：adapters 住在 core 时，web 里出现 adapters 目录必须红
  const mPath2 = join(root, states.cap, 'design/manifest.json')
  const mGood2 = readFileSync(mPath2, 'utf8')
  const mBad2 = JSON.parse(mGood2)
  mBad2.elements.find((e) => e.id === 'D-B-01').file = 'packages/web/src/cap-x/adapters/x.ts'
  mBad2.elements.find((e) => e.id === 'D-B-01').landing = 'packages/web/src/cap-x/adapters/x.ts'
  writeFileSync(mPath2, JSON.stringify(mBad2, null, 2))
  r = run(CHECK, ['--root', root, '--run', states.cap, '--phase', 'C4'])
  expect('PLACEMENT adapters 写进 web → C4 红', r, 1)
  writeFileSync(mPath2, mGood2)
  r = run(CHECK, ['--root', root, '--run', states.cap, '--phase', 'C4'])
  expect('PLACEMENT 恢复后 C4 绿', r, 0)

  // runtimeFit：业务规则落 web / 呈现逻辑落 core / 缺 runtime 都必须红
  const rtBad = JSON.parse(mGood2)
  rtBad.elements.find((e) => e.id === 'D-B-01').runtime = 'server'
  rtBad.elements.find((e) => e.id === 'D-B-01').landing = 'packages/web/src/cap-x/use-cases/open-session.ts'
  writeFileSync(mPath2, JSON.stringify(rtBad, null, 2))
  r = run(CHECK, ['--root', root, '--run', states.cap, '--phase', 'C4'])
  expect('RUNTIME 服务端规则落 web → C4 红', r, 1)

  const rtNoRuntime = JSON.parse(mGood2)
  delete rtNoRuntime.elements.find((e) => e.id === 'D-B-01').runtime
  writeFileSync(mPath2, JSON.stringify(rtNoRuntime, null, 2))
  r = run(CHECK, ['--root', root, '--run', states.cap, '--phase', 'C4'])
  expect('RUNTIME 元素没声明 runtime → C4 红', r, 1)

  const rtClientCore = JSON.parse(mGood2)
  rtClientCore.elements.find((e) => e.id === 'D-U-01').runtime = 'client'
  rtClientCore.elements.find((e) => e.id === 'D-U-01').landing =
    'packages/core/src/cap-x/domain/present.ts'
  writeFileSync(mPath2, JSON.stringify(rtClientCore, null, 2))
  r = run(CHECK, ['--root', root, '--run', states.cap, '--phase', 'C4'])
  expect('RUNTIME 呈现逻辑落 core → C4 红', r, 1)
  writeFileSync(mPath2, mGood2)
  r = run(CHECK, ['--root', root, '--run', states.cap, '--phase', 'C4'])
  expect('RUNTIME 恢复后 C4 绿', r, 0)

  // 度量与清单对账：把落点文件撑到 400 行以上，清单还写 pass → 必须红
  const landedPath = join(root, 'packages/web/src/cap-x/foo.ts')
  const landedGood = readFileSync(landedPath, 'utf8')
  writeFileSync(landedPath, `${landedGood}${'\n// pad\n'.repeat(210)}`)
  r = run(CHECK, ['--root', root, '--run', states.cap, '--phase', 'C5'])
  expect('REVIEW 度量超限未登记 → C5 红', r, 1)
  writeFileSync(landedPath, landedGood)
  r = run(CHECK, ['--root', root, '--run', states.cap, '--phase', 'C5'])
  expect('REVIEW 恢复后 C5 绿', r, 0)

  // 实施前的观察：删掉 observations/T-02.md → C5 红（不能只靠自觉）
  const obsPath = join(root, states.cap, 'observations/T-02.md')
  const obsGood = readFileSync(obsPath, 'utf8')
  writeFileSync(obsPath, '# 空的\n')
  r = run(CHECK, ['--root', root, '--run', states.cap, '--phase', 'C5'])
  expect('OBS 观察缺三段 → C5 红', r, 1)
  writeFileSync(obsPath, obsGood)
  r = run(CHECK, ['--root', root, '--run', states.cap, '--phase', 'C5'])
  expect('OBS 恢复后 C5 绿', r, 0)

  r = run(VERIFY, [
    '--root',
    root,
    '--run',
    states.cap,
    '--id',
    'C5',
    '--cmd',
    'node -e "process.exit(3)"',
  ])
  expect('VERIFY 命令失败 → exit 1（证据仍写入）', r, 1)
  r = run(CHECK, ['--root', root, '--run', states.cap, '--phase', 'C5'])
  expect('VERIFY 失败证据 → C5 红', r, 1)
  r = run(VERIFY, [
    '--root',
    root,
    '--run',
    states.cap,
    '--id',
    'C5',
    '--from-plan',
    'plans/C-fixture.md',
  ])
  expect('VERIFY 重跑恢复绿色', r, 0)

  // 用了 quality.md 而不是已删除的 decomposition.md：C4 现在只交三份文档
  const slowPath = join(root, states.cap, 'design/quality.md')
  const slowGood = readFileSync(slowPath, 'utf8')
  writeFileSync(slowPath, `${slowGood}${'\n'.repeat(500)}`)
  r = run(VOLUME, ['--root', root, '--run', states.cap])
  expect('VOLUME 判断型文档超 400 行 → 红', r, 1)
  writeFileSync(slowPath, slowGood)
  r = run(VOLUME, ['--root', root, '--run', states.cap])
  expect('VOLUME 恢复合规', r, 0)

  // ── 外部 IO：god 自己不写 fetch 时，契约分母靠追 import（C-G 试点暴露的缺口）──
  {
    const web = join(root, 'ext-src/web')
    mkdirSync(join(web, 'components'), { recursive: true })
    writeFileSync(
      join(web, 'components/God.tsx'),
      [
        "import { load } from './helpers'",
        'export function God() {',
        '  return load()',
        '}',
        '',
      ].join('\n'),
    )
    writeFileSync(
      join(web, 'components/helpers.ts'),
      [
        'export function load(cwd: string) {',
        '  return fetch("/api/ghost?cwd=" + encodeURIComponent(cwd))',
        '}',
        '',
      ].join('\n'),
    )
    const godPath = join(web, 'components/God.tsx')
    const bare = checkExternalIo({ godPath, root: web, contractDelta: '', wireText: '' })
    if (!bare.ok && bare.problems.length >= 1) ok('EXTERNAL 追到 import 里的 /api/ 调用')
    else bad('EXTERNAL 追到 import 里的 /api/ 调用', JSON.stringify(bare))
    const listed = checkExternalIo({
      godPath,
      root: web,
      contractDelta: [
        '## 外部依赖',
        '',
        '| 模块 | 命令 | 契约位置 |',
        '|---|---|---|',
        '| `helpers.ts` | `GET /api/ghost` | `wire.md:9` |',
        '',
      ].join('\n'),
      wireText: '| `GET /api/ghost` | 幽灵端点 | `app/api/ghost/route.ts:1` |',
    })
    if (listed.ok) ok('EXTERNAL 登记并对上契约后变绿')
    else bad('EXTERNAL 登记并对上契约后变绿', listed.problems.join('；'))
    const wrongWire = checkExternalIo({
      godPath,
      root: web,
      contractDelta: [
        '## 外部依赖',
        '| 模块 | 命令 |',
        '|---|---|',
        '| `helpers.ts` | `GET /api/ghost` |',
        '',
      ].join('\n'),
      wireText: '| `GET /api/other` | 别的端点 |',
    })
    if (wrongWire.problems.some((p) => p.includes('/api/ghost')))
      ok('EXTERNAL 契约里没有该命令 → 红')
    else bad('EXTERNAL 契约里没有该命令 → 红', JSON.stringify(wrongWire.problems))
  }

  // 播种：幂等且保留人工填写（先播一次拿到真实行，再改一行，再播一次看是否被保留）
  const mapFile = join(root, states.cap, 'symbol-map.md')
  run(SEED, ['--root', root, '--run', states.cap])
  const mapBefore = readFileSync(mapFile, 'utf8')
  const mapEdited = mapBefore.replace(
    /^(\|[^|]+\| `v0` \|[^|]+\| )(待定|[A-Z]{1,3}-\d+)( \|)/m,
    '$1F-77$3',
  )
  if (mapEdited.includes('F-77')) {
    writeFileSync(mapFile, mapEdited)
    r = run(SEED, ['--root', root, '--run', states.cap])
    expect('SEED 播种幂等', r, 0)
    const mapAfter = readFileSync(mapFile, 'utf8')
    if (mapAfter.includes('F-77')) ok('SEED 保留人工填写的 owner')
    else bad('SEED 保留人工填写的 owner', mapAfter.split('\n').find((l) => l.includes('v0')))
    writeFileSync(mapFile, mapBefore)
  } else {
    bad('SEED 保留人工填写的 owner', 'symbol-map 里没有 `v0` 行（播种没覆盖到夹具符号）')
  }

  // 批量认领表面点
  const manifestPath2 = join(root, states.cap, 'design/manifest.json')
  const manifestGood2 = readFileSync(manifestPath2, 'utf8')
  const m2 = JSON.parse(manifestGood2)
  const totalSurfaces = Object.keys(m2.surfaces).length
  m2.surfaces = {}
  m2.excluded = {}
  writeFileSync(manifestPath2, JSON.stringify(m2, null, 2))
  r = run(CLAIM, ['--root', root, '--run', states.cap, '--report', '--json'])
  expect('CLAIM --report 可读', r, 0)
  const jStart = r.out.indexOf('{')
  const jEnd = r.out.lastIndexOf('}')
  const rep = JSON.parse(jStart >= 0 && jEnd > jStart ? r.out.slice(jStart, jEnd + 1) : '{}')
  if (rep.unclaimed === totalSurfaces) ok(`CLAIM 报告未认领 ${rep.unclaimed}/${rep.total}`)
  else bad('CLAIM 报告未认领数', JSON.stringify(rep))
  r = run(CLAIM, [
    '--root',
    root,
    '--run',
    states.cap,
    '--owner',
    'D-B-01',
    '--kind',
    'handler:onClick',
  ])
  expect('CLAIM 按类型批量认领', r, 0)
  r = run(CLAIM, ['--root', root, '--run', states.cap, '--owner', 'D-B-01'])
  expect('CLAIM 认领剩余', r, 0)
  r = run(DESIGN, [
    '--root',
    root,
    '--run',
    states.cap,
    '--program',
    states.program,
    '--design-only',
  ])
  expect('CLAIM 后 D2 恢复绿', r, 0)
  writeFileSync(manifestPath2, manifestGood2)
  r = run(CLAIM, ['--root', root, '--run', states.cap, '--exclude', 'D-X-99'])
  expect('CLAIM exclude 缺理由 → exit 2', r, 2)

  // 行级交付门：三档递进，逐档可红
  r = run(LINES, ['--root', root, '--run', states.cap, '--mode', 'structure'])
  expect('LINES structure 连续无空洞', r, 0)
  r = run(LINES, ['--root', root, '--run', states.cap, '--mode', 'bind'])
  expect('LINES bind 元素与行区间互相闭合', r, 0)
  r = run(LINES, ['--root', root, '--run', states.cap, '--mode', 'landed'])
  expect('LINES landed 落地文件带 @design 标记', r, 0)

  const ownPath = join(root, states.cap, 'ownership.md')
  const ownGood = readFileSync(ownPath, 'utf8')
  writeFileSync(ownPath, ownGood.replace('L601-L1100', 'L601-L1050'))
  r = run(LINES, ['--root', root, '--run', states.cap, '--mode', 'structure'])
  expect('LINES 空洞 → 红', r, 1)
  writeFileSync(ownPath, ownGood.replace('| D-B-01 |', '| 布局容器 |'))
  r = run(LINES, ['--root', root, '--run', states.cap, '--mode', 'structure'])
  expect('LINES owner 非元素 ID → 红', r, 1)
  writeFileSync(ownPath, ownGood.replace('L1101-L1200', 'L1101-L1150'))
  r = run(LINES, ['--root', root, '--run', states.cap, '--mode', 'structure'])
  expect('LINES drop 未进砍掉清单 → 红', r, 1)
  writeFileSync(ownPath, ownGood)

  const cutPath = join(root, states.cap, 'cut-list.md')
  const cutGood = readFileSync(cutPath, 'utf8')
  writeFileSync(cutPath, cutGood.replace('| 由 evo-pi 配置中心统一提供 |', '|  |'))
  r = run(LINES, ['--root', root, '--run', states.cap, '--mode', 'structure'])
  expect('CUTLIST 缺理由 → 红', r, 1)
  writeFileSync(cutPath, cutGood)

  const landFile = join(root, 'packages/web/src/cap-x/foo.ts')
  const landGood = readFileSync(landFile, 'utf8')
  writeFileSync(landFile, 'export const foo = 1\n')
  r = run(LINES, ['--root', root, '--run', states.cap, '--mode', 'landed'])
  expect('LINES 落地缺 @design 标记 → 红', r, 1)
  writeFileSync(landFile, landGood)
  r = run(LINES, ['--root', root, '--run', states.cap, '--mode', 'landed'])
  expect('LINES 恢复绿', r, 0)

  r = run(STATE, ['pause', '--root', root, '--run', states.cap, '--note', '等用户确认'])
  expect('PAUSE 记录暂停', r, 0)
  r = run(STATE, ['resume', '--root', root, '--run', states.cap])
  expect('RESUME 恢复', r, 0)
  r = run(STATE, ['reopen', '--root', root, '--run', states.cap])
  expect('REOPEN 缺理由 → exit 2', r, 2)
  r = run(VERIFY, [
    '--root',
    root,
    '--run',
    states.cap,
    '--id',
    'C5',
    '--from-plan',
    'plans/C-fixture.md',
    '--dry-run',
  ])
  expect('VERIFY --dry-run 不执行', r, 0)
  if (r.out.includes('process.exit(0)')) ok('VERIFY --dry-run 列出计划命令')
  else bad('VERIFY --dry-run 列出计划命令', r.out)

  // ═════════ 6) 迁入的技法脚本：正向 + 负向 ═════════
  r = run(SYMBOLS, ['--root', root, '--run', states.cap])
  expect('check-symbols 对账平', r, 0)
  const mapPath = join(root, states.cap, 'symbol-map.md')
  const mapGood = readFileSync(mapPath, 'utf8')
  // 多 god 之后 symbol-map 的前两列是「文件 | 符号」，按符号名定位而不是按行首定位
  writeFileSync(mapPath, mapGood.replace(/^\| [^|]+ \| `v7` \|.*$/m, ''))
  r = run(SYMBOLS, ['--root', root, '--run', states.cap])
  expect('check-symbols 漏符号 → 红', r, 1)
  writeFileSync(mapPath, mapGood)
  r = run(SYMBOLS, ['--root', root, '--run', states.cap, '--bogus'])
  expect('check-symbols 未知参数 → exit 2', r, 2)

  // 基础设施能力没有界面：uiProto 允许「## 不适用」，但不许只写四个字
  if (!checkUiProto({ md: '## 不适用\n没有界面\n' }).ok) ok('UIPROTO 不适用但理由太短 → 红')
  else bad('UIPROTO 不适用但理由太短 → 红', '仍判绿')
  if (
    checkUiProto({
      md: '## 不适用\n本能力是运行时基础设施，不渲染界面：证据 hooks/useAgentSession.ts:342 只返回状态与动作。\n',
    }).ok
  )
    ok('UIPROTO 不适用 + 理由 + 证据 → 绿')
  else bad('UIPROTO 不适用 + 理由 + 证据 → 绿', '仍判红')
  if (!checkUiProto({ md: '```text\n┌──┐\n│a │\n└──┘\n```\n' }).ok)
    ok('UIPROTO 有 ASCII 但没有交互态 → 仍按界面能力判红')
  else bad('UIPROTO 有 ASCII 但没有交互态 → 仍按界面能力判红', '判绿了')

  r = run(SPECS, ['--root', root, '--run', states.cap])
  expect('check-specs 通过', r, 0)
  const specPath = join(root, states.cap, 'specs/F-01.md')
  const specGood = readFileSync(specPath, 'utf8')
  writeFileSync(specPath, specGood.replaceAll('fake-src/Cap.tsx:5', 'fake-src/Cap.tsx:9999'))
  r = run(SPECS, ['--root', root, '--run', states.cap])
  expect('check-specs 证据行越界 → 红', r, 1)
  writeFileSync(specPath, specGood.replace('T-01', 'T-99'))
  r = run(SPECS, ['--root', root, '--run', states.cap])
  expect('check-specs 测试 ID 未落地 → 红', r, 1)
  writeFileSync(specPath, specGood)

  r = run(CONTRACTS, ['--root', root, '--run', states.cap, '--program', states.program])
  const contractRes = r
  if (contractRes.code === 0) ok('check-contracts 无命令/事件表面点 → 通过（无可对账项）')
  else bad('check-contracts 无命令/事件表面点 → 通过', contractRes.out)
  const surfacePath = join(root, states.cap, 'surface.json')
  const surfaceGood = readFileSync(surfacePath, 'utf8')
  const surfaceInjected = JSON.parse(surfaceGood)
  surfaceInjected.entries.push({
    id: 'SF-X-c00001',
    kind: 'command',
    text: 'ghost.command',
    file: 'x',
    line: 1,
  })
  writeFileSync(surfacePath, JSON.stringify(surfaceInjected))
  r = run(CONTRACTS, ['--root', root, '--run', states.cap, '--program', states.program])
  expect('check-contracts 源码有命令但契约缺 → 红', r, 1)
  writeFileSync(surfacePath, surfaceGood)

  w(
    'ref_projects/pi-web/openwiki/tech-debt/Fixture.md',
    '---\nverified:\n  - at: 2020-01-01\n---\n\n`repo://components/Fixture.tsx`\n',
  )
  r = run(DRIFT, [
    '--root',
    root,
    '--page',
    'tech-debt/Fixture.md',
    '--wiki-root',
    join(root, 'ref_projects/pi-web/openwiki'),
  ])
  expect('check-openwiki-drift 过期页 → STALE', r, 1)
  w(
    'ref_projects/pi-web/openwiki/tech-debt/Fresh.md',
    '---\nverified:\n  - at: 2099-01-01\n---\n\n`repo://components/Fixture.tsx`\n',
  )
  r = run(DRIFT, [
    '--root',
    root,
    '--page',
    'tech-debt/Fresh.md',
    '--wiki-root',
    join(root, 'ref_projects/pi-web/openwiki'),
  ])
  expect('check-openwiki-drift 未过期页 → FRESH', r, 0)
  r = run(DRIFT, [
    '--page',
    'tech-debt/Nope.md',
    '--wiki-root',
    join(root, 'ref_projects/pi-web/openwiki'),
  ])
  expect('check-openwiki-drift 页面不存在 → exit 2', r, 2)

  // ═════════ 7) Cutover 作用域（含收尾审计门）═════════
  r = run(STATE, [
    'init',
    '--root',
    root,
    '--run',
    states.cutover,
    '--scope',
    'cutover',
    '--program',
    states.program,
  ])
  expect('X: init 建档', r, 0)
  w(
    `${states.cutover}/cutover/REHEARSAL.md`,
    [
      '# 割接预演',
      '',
      '用真实数据副本（不写 live `~/.pi/agent`）在 30041 跑一遍完整日流程。',
      '',
      '## 全日流程',
      '',
      '- \u2705 开项目 → 多会话 → 发送 → 中断 → 恢复 → 文件预览',
      '- \u2705 深链、刷新、后退各走一遍',
      '- \u2705 通知只弹一次（单一 sink 生效）',
      '',
      '## 回滚演练',
      '',
      '实跑一次回滚命令，3 分钟内回到 pi-web；数据目录未被写入。',
      '',
    ].join('\n'),
  )
  adv('cutover', 'X1')
  w(
    `${states.cutover}/cutover/RUNBOOK-executed.md`,
    [
      '# 割接执行',
      '',
      '## 执行记录',
      '',
      '- 按 runbook 执行，耗时 25 分钟；pi-web 已冻结为只读归档。',
      '- 数据目录未迁移：两个应用共用同一个 `PI_CODING_AGENT_DIR`，会话文件双向可读。',
      '',
      '## 用户验收',
      '',
      '- \u2705 门 1 内部代码测试',
      '- \u2705 门 2 浏览器功能测试',
      '- \u2705 门 3 与 pi-web 交叉比对',
      '- \u2705 门 4 用户手工验收',
      '- \u2705 门 5 验收通过',
      '',
    ].join('\n'),
  )
  r = run(VERIFY, [
    '--root',
    root,
    '--run',
    states.cutover,
    '--id',
    'X1',
    '--cmd',
    'node -e "process.exit(0)"',
  ])
  expect('X1 record-verification', r, 0)
  r = run(STATE, ['advance', '--root', root, '--run', states.cutover])
  expect('X1 能力未全部完成时拒绝推进', r, 1)
  wp(
    'CAPABILITIES.md',
    [
      '# 能力切片',
      '',
      '## 1. 能力清单',
      '',
      table(
        ['#', '能力', '包含 god', 'R 级', '依赖能力', '状态'],
        [['C-1', 'fixture 能力', '`Fixture.tsx`', 'R3', '—', '已完成']],
      ),
      '## 2. 拓扑序',
      '',
      'C-1 → 割接',
      '',
      '## 3. 裁线',
      '',
      'M1 = C-1。',
      '',
    ].join('\n'),
  )
  adv('cutover', 'X2')
  w(
    `${states.cutover}/cutover/POSTMORTEM.md`,
    [
      '# 割接复盘',
      '',
      '## 遗留项',
      '',
      '- 无。若有遗留项，必须在此点名并附 issue 号，不许留在 state.json 里装死。',
      '- 若某项决定不做，写明理由与影响面。',
      '',
      '## 规则回灌',
      '',
      '- `arch/rules.json` 已更新（新增通知通道约束）。',
      '- ADR 0004 已补充"通知不是状态"的说明。',
      '',
    ].join('\n'),
  )
  adv('cutover', null)
  r = run(CHECK, ['--root', root, '--run', states.cutover, '--all'])
  expect('Cutover 全阶段门 --all 全绿', r, 0)

  // ═════════ 8) 技能自检 ═════════
  r = run(LINT, [])
  expect('lint-skill 自检通过', r, 0)

  // 孤儿检查：塞一个没人引用的模板，lint 必须报出来（没文档引用 / 不在模板表）
  // 为什么这条必须有：孤儿文件是"写了但没人会读到"，只有 lint 会说话——
  // 上一轮就漏了 6 个模板和 3 个 lib，全部靠人工 grep 才发现。
  {
    const tplDir = join(HERE, '..', 'references', 'templates')
    const orphan = join(tplDir, 'zz-orphan-fixture.md')
    writeFileSync(orphan, '# 孤儿模板 — `<run>/nowhere.md`\n\n> 没有任何门检查它。\n')
    try {
      const res = run(LINT, [])
      if (res.code === 0) bad('孤儿模板 → lint 红', 'lint 通过了，孤儿检查没生效')
      else if (!res.out.includes('zz-orphan-fixture')) {
        bad('孤儿模板 → lint 红', `报错了但没点名孤儿：\n${res.out}`)
      } else ok('孤儿模板 → lint 红')
    } finally {
      rmSync(orphan, { force: true })
    }
    expect('删掉孤儿后 lint 恢复绿', run(LINT, []), 0)
  }

  // ═════════ P1/P3/P2 新门：每个都要能红（用户要求"确保机器可验证"）═════════
  // P6 环境矩阵：缺项必须红，不能靠"我记得写过"
  const envPath = join(root, states.program, 'environment.md')
  const envGood = readFileSync(envPath, 'utf8')
  writeFileSync(envPath, envGood.replace('PI_CODING_AGENT_DIR', '某个变量'))
  expect('P1 环境矩阵缺项 → 红', run(CHECK, ['--root', root, '--run', states.program, '--phase', 'P1']), 1)
  writeFileSync(envPath, envGood)
  expect('P1 环境矩阵恢复 → 绿', run(CHECK, ['--root', root, '--run', states.program, '--phase', 'P1']), 0)

  // P2 分母同源：对账声明的条数/来源 sha 必须能复算，手填数字一律不认
  const parityP = join(root, states.cap, 'parity.md')
  const parityGood = readFileSync(parityP, 'utf8')
  writeFileSync(parityP, parityGood.replace('分母：1 条', '分母：9 条'))
  expect('C6 对账分母 → 条数与来源不符时红', (refreshParitySha(), run(CHECK, ['--root', root, '--run', states.cap, '--phase', 'C6'])), 1)
  writeFileSync(parityP, parityGood.replace(/sha [0-9a-f]{8}/, 'sha deadbeef'))
  // 改文档 = 签字失效，所以先重新签，再验"sha 漂移只提示不判红"
  signParity()
  // sha 变了但条数没变：判绿但必须提示（拦住"改了来源没说一声"，也不误杀算术上成立的对账）
  const staleRun = run(CHECK, ['--root', root, '--run', states.cap, '--phase', 'C6'])
  if (staleRun.code === 0 && staleRun.out.includes('sha 已变')) ok('C6 分母 sha 变化 → 绿但提示重算')
  else bad('C6 分母 sha 变化 → 绿但提示重算', `exit ${staleRun.code}\n${staleRun.out}`)
  writeFileSync(parityP, parityGood)
  signParity()
  expect('C6 对账分母恢复 → 绿', (refreshParitySha(), run(CHECK, ['--root', root, '--run', states.cap, '--phase', 'C6'])), 0)

  // P3 变更传播单：视图没列全必须红（"改了 7 处却只记 3 处"是真实发生过的）
  const changesDir = join(root, states.cap, 'changes')
  mkdirSync(changesDir, { recursive: true })
  const chgPath = join(changesDir, 'CHG-001.md')
  writeFileSync(
    chgPath,
    [
      '# 变更单 CHG-001',
      '',
      '| 视图 | 状态 | 说明 |',
      '| --- | --- | --- |',
      '| spec.md | done | 不迁范围写进不做清单 |',
      '| design/manifest.json | done | 删掉元素 |',
      '',
    ].join('\n'),
  )
  expect('P3 砍单无变更单 → 红', run(CHECK, ['--root', root, '--run', states.cap, '--phase', 'C5']), 1)
  writeFileSync(
    chgPath,
    [
      '# 变更单 CHG-001',
      '',
      '| 视图 | 状态 | 说明 |',
      '| --- | --- | --- |',
      '| spec.md | done | 不迁范围写进不做清单 |',
      '| design/manifest.json | done | 删掉元素 |',
      '| design/components.md | done | 删掉类图节点 |',
      '| design/dynamics.md | done | 删掉序列图小节 |',
      '| ownership.md | done | 该段标 drop |',
      '| cut-list.md | done | 补一行四列 |',
      '| behaviors.md | done | 删 4 条行为 |',
      '| harness/registry.json | done | 删 4 个脚本 |',
      '| plans/*.md | done | 删 4 个任务 |',
      '| 代码（packages/**） | done | 删用例与端口 |',
      '',
    ].join('\n'),
  )
  expect('P3 变更单视图列全 → 绿', run(CHECK, ['--root', root, '--run', states.cap, '--phase', 'C5']), 0)
  rmSync(chgPath, { force: true })

  // 门目录：概念门/阶段门/实现三方对账（防幻影门、死门、文档漂移）
  const GATESMAP = join(HERE, 'check-gates-map.mjs')
  expect('check-gates-map：代码与 gates.md 一致', run(GATESMAP, []), 0)
  const gatesDoc = join(HERE, '..', 'references', 'gates.md')
  const goodGates = readFileSync(gatesDoc, 'utf8')
  writeFileSync(
    gatesDoc,
    goodGates.replace(
      '<!-- KINDS:END -->',
      '| `ghostGate` | P0 | 只在文档里的门 |\n<!-- KINDS:END -->',
    ),
  )
  expect('门目录多出一行假门 → 红', run(GATESMAP, []), 1)
  writeFileSync(gatesDoc, goodGates)
  expect('恢复后门目录再绿', run(GATESMAP, []), 0)
} finally {
  // KEEP=1 保留临时根目录，便于复现失败（调试用，平时不设）
  if (!process.env.KEEP) rmSync(root, { recursive: true, force: true })
  else console.log(`\n（KEEP=1：临时根保留在 ${root}）`)
}

// ─── 第四批反向用例：run 级，用**独立负例 run**（不碰正向夹具） ───
{
  // 独立负例 run：只有一个 god + 最小 CHARTER，用来单独踩某道门
  const neg = '.evo/migration/20990101-neg'
  const godLines = 4
  const nogod = (extra = {}) => ({
    schemaVersion: 3,
    skill: 'migrating-god-files',
    skillVersion: 3,
    scope: 'capability',
    rLevel: 'R1',
    gods: [{ path: 'fake-src/neg.ts', lines: godLines, sha1: 'deadbeef', symbols: 2 }],
    phase: 'C0',
    phaseStatus: 'in_progress',
    phases: { C0: { status: 'in_progress' } },
    signoffs: {},
    decisions: [],
    tasks: {},
    history: [],
    closed: false,
    ...extra,
  })
  w(`${neg}/state.json`, `${JSON.stringify(nogod(), null, 2)}\n`)
  w(`${neg}/CHARTER.md`, `# CHARTER — 负例\n\n## 1. 范围\n\n- \`fake-src/neg.ts\` ${godLines} 行\n\n## 2. 基线指纹\n\n\`deadbeef\` ${godLines} 行\n\n## 3. 不做清单\n\n- 不做\n\n## 4. 渲染边界\n\n| 区域 | 宿主 | 说明 |\n| --- | --- | --- |\n| 主体 | self | 本能力自己的界面 |\n\n## 5. 验收门\n\n- L1–L6\n\n## 6. 已知风险\n\n- 无\n`)
  w('fake-src/neg.ts', 'const a = 1\nconst b = 2\nconst c = 3\nconst d = 4\n')

  const redKinds = (phase) => {
    const res = run(CHECK, ['--root', root, '--run', neg, '--phase', phase, '--json'])
    try {
      const j = JSON.parse(res.out)
      return j.reports.flatMap((r) => r.results || []).filter((x) => !x.ok).map((x) => x.id)
    } catch {
      return [`<parse-failed:${res.out.slice(0, 80)}>`]
    }
  }

  // RLEVEL：缺 R 级
  w(`${neg}/state.json`, `${JSON.stringify(nogod({ rLevel: undefined }), null, 2)}\n`)
  if (redKinds('C0').some((id) => id.startsWith('C0:rlevel'))) ok('RLEVEL 缺 R 级 → 红')
  else bad('RLEVEL 缺 R 级 → 红', redKinds('C0').join(','))

  // GODFINGERPRINT：行数与源码不符
  w(`${neg}/state.json`, `${JSON.stringify(nogod(), null, 2).replace(`"lines": ${godLines}`, '"lines": 999')}\n`)
  if (redKinds('C0').some((id) => id.startsWith('C0:godFingerprint')))
    ok('GODFINGERPRINT 行数不符 → 红')
  else bad('GODFINGERPRINT 行数不符 → 红', redKinds('C0').join(','))

  // HEADING：CHARTER 缺必需小节
  w(`${neg}/state.json`, `${JSON.stringify(nogod(), null, 2)}\n`)
  w(
    `${neg}/CHARTER.md`,
    '# CHARTER — 负例\n\n## 1. 范围\n\n- `fake-src/neg.ts` 4 行\n',
  )
  if (redKinds('C0').some((id) => id.startsWith('C0:heading:CHARTER.md:## 2. 基线指纹')))
    ok('HEADING 缺必需小节 → 红')
  else bad('HEADING 缺必需小节 → 红', redKinds('C0').join(','))

  // LINES：归属区间有缝
  w(`${neg}/CHARTER.md`, `# CHARTER — 负例\n\n## 1. 范围\n\n- \`fake-src/neg.ts\` 4 行\n\n## 2. 基线指纹\n\n\`deadbeef\` 4 行\n\n## 3. 不做清单\n\n- 不做\n\n## 4. 渲染边界\n\n| 区域 | 宿主 | 说明 |\n| --- | --- | --- |\n| 主体 | self | 本能力自己的界面 |\n\n## 5. 验收门\n\n- L1\n\n## 6. 已知风险\n\n- 无\n`)
  w(
    `${neg}/ownership.md`,
    '# 归属切分\n\n## 1. 归属区间表\n\n| 区间 | 设计元素 | 类型 | 判据 |\n| --- | --- | --- | --- |\n| L1-L2 | D-U-01 | feature | 前两行 |\n',
  )
  if (redKinds('C1').some((id) => id.startsWith('C1:lines'))) ok('LINES 归属区间有缝 → 红')
  else bad('LINES 归属区间有缝 → 红', redKinds('C1').join(','))

  // PROGRAMPREREQ：能力没关联 program run
  w(`${neg}/state.json`, `${JSON.stringify(nogod({ programRun: undefined }), null, 2)}\n`)
  if (redKinds('C0').some((id) => id.startsWith('C0:programPrereq')))
    ok('PROGRAMPREREQ 没关联 program → 红')
  else bad('PROGRAMPREREQ 没关联 program → 红', redKinds('C0').join(','))

  // BEHAVIORS：behaviors.md 里没有 B- 行
  w(`${neg}/state.json`, `${JSON.stringify(nogod(), null, 2)}\n`)
  w(`${neg}/behaviors.md`, '# 行为\n\n## 行为清单\n\n| id | 说明 | 证据 | 脚本 |\n| --- | --- | --- | --- |\n| X-1 | 不是 B 行 | fake-src/neg.ts:1 | s-001 |\n')
  w(`${neg}/harness/registry.json`, `${JSON.stringify({ scripts: [] }, null, 2)}\n`)
  if (redKinds('C3').some((id) => id.startsWith('C3:behaviors')))
    ok('BEHAVIORS 没有 B- 行 → 红')
  else bad('BEHAVIORS 没有 B- 行 → 红', redKinds('C3').join(','))

  rmSync(join(root, neg), { recursive: true, force: true })
}

// ─── 第二批反向用例：lib 级，直接喂坏输入 ───
{
  const envBad = checkEnvDoc('## 端口\n\n没有表格也没有关键条目\n')
  if (!envBad.ok) ok('ENV 环境矩阵缺项 → 红')
  else bad('ENV 环境矩阵缺项 → 红', '空文档被判绿')

  const feBad = runFrontendArch({ programDir: root, rules: {} })
  if (!feBad.ok) ok('FRONTEND rules 缺 frontend → 红')
  else bad('FRONTEND rules 缺 frontend → 红', '未报缺 frontend')

  const tmpProg = mkdtempSync(join(tmpdir(), 'stubplan-'))
  const spBad = runStubPlan({ programDir: tmpProg, root })
  if (!spBad.ok) ok('STUBPLAN 缺桩清单 → 红')
  else bad('STUBPLAN 缺桩清单 → 红', '缺文件被判绿')
  rmSync(tmpProg, { recursive: true, force: true })

  const tmpCap = mkdtempSync(join(tmpdir(), 'integ-'))
  writeFileSync(
    join(tmpCap, 'integration.md'),
    [
      '## 替换表',
      '',
      '| 命令 | 桩 | 真实现 | 联调证据 |',
      '| --- | --- | --- | --- |',
      '| POST /api/x | 假传输 | 桩 | gates/C5.json |',
      '',
    ].join('\n'),
  )
    // surface 必须给出这条命令，否则"0 个 HTTP 命令"会被判绿（这也是门的一个真实边界）
  const itBad = runIntegration({
    capabilityDir: tmpCap,
    surface: { entries: [{ kind: 'api', text: 'POST /api/x' }] },
    root,
  })
  if (!itBad.ok) ok('INTEGRATION 真实现写成桩 → 红')
  else bad('INTEGRATION 真实现写成桩 → 红', '写了"桩"仍判绿')

  writeFileSync(
    join(tmpCap, 'acceptance.md'),
    ['## 验收阶梯', '', '| 层级 | 命令 | 结果 | 证据 | 签字 |', '| --- | --- | --- | --- | --- |', '| L1 | vitest | pass | gates/C5.json | |', '| L6 | 人工 | pending | | |', ''].join('\n'),
  )
  const acBad = runAcceptance({ capabilityDir: tmpCap, surface: { entries: [] }, mode: 'final' })
  if (!acBad.ok) ok('ACCEPTANCE L6 未签 → 红')
  else bad('ACCEPTANCE L6 未签 → 红', 'pending 被判绿')
  rmSync(tmpCap, { recursive: true, force: true })

  const tmpFid = mkdtempSync(join(tmpdir(), 'fid-'))
  const fidBad = checkFidelity({ runDir: tmpFid, docText: '## 保真缺口组\n\n| 组 |\n| --- |\n' })
  if (!fidBad.ok) ok('FIDELITY 缺快照 → 红')
  else bad('FIDELITY 缺快照 → 红', '无快照被判绿')
  rmSync(tmpFid, { recursive: true, force: true })

  const re = globToRegExp('packages/core/src/*/domain/**')
  const hit = re.test('packages/core/src/chat/domain/ports/x.ts')
  const miss = !re.test('packages/web/src/domain/x.ts')
  // 目录写法（不带 /**）必须同样覆盖子孙：这是 layerOf 的判据，不是 globToRegExp 的
  // 目录写法（不带通配符）必须自动覆盖子孙：`layerOf` 会给纯目录补 `/**`
  const dirHit = layerOf('packages/core/src/chat/domain/ports/x.ts', {
    domain: ['packages/core/src/chat/domain'],
  }).includes('domain')
  if (hit && miss && dirHit) ok('GLOB 目录写法覆盖子孙且不跨包')
  else bad('GLOB 目录写法覆盖子孙且不跨包', JSON.stringify({ hit, miss, dirHit }))

  const invBad = checkContractInventory({
    surface: { entries: [{ kind: 'api', text: 'GET /api/ghost' }] },
    wireText: '',
  })
  if (!invBad.ok) ok('C2 源码端点未进契约红')
  else bad('C2 源码端点未进契约红', '空契约被判绿')
}

// ─── 门自身的反向用例（2026-10-25）：38 道门此前只证明"会绿"，
// 没证明"会红"。这里直接打 lib 层，不再绕夹具——夹具用例慢且容易互相干扰。
{
  const bullets = '- **alpha** (function) …\n'
  const sym = runSymbolParity({
    symbolsText: `${bullets}- **beta** (function) …\n`,
    mapText: '| 文件 | 符号 | 行号 | 归属 | 状态 | 理由 |\n|---|---|---|---|---|---|\n| `G.tsx` | `alpha` | 1 | D-U-01 | pending |  |\n',
    root,
  })
  if (!sym.ok) ok('SYMBOLS 漏符号 → 红')
  else bad('SYMBOLS 漏符号 → 红', 'runSymbolParity 没报缺失')

  const symOk = runSymbolParity({
    symbolsText: bullets,
    mapText: '| 文件 | 符号 | 行号 | 归属 | 状态 | 理由 |\n|---|---|---|---|---|---|\n| `G.tsx` | `alpha` | 1 | D-U-01 | pending |  |\n',
    root,
  })
  if (symOk.ok) ok('SYMBOLS 恢复 → 绿')
  else bad('SYMBOLS 恢复 → 绿', JSON.stringify(symOk.problems ?? symOk))

  const inv = checkContractInventory({
    surface: { entries: [{ kind: 'api', name: 'POST /api/ghost-x' }] },
    wireText: '| 命令 | 方法 | 路径 | 证据 |\n|---|---|---|---|\n| `GET /api/real` | GET | /api/real | a.ts:1 |\n',
  })
  if (!inv.ok) ok('C2 源码端点未进契约红')
  else bad('C2 源码端点未进契约红', '未报缺')

  const align = checkContractAlign('## 对齐表\n\n| 用到的东西 | 契约位置 | 差异处置 |\n|---|---|---|\n| `GET /api/x` | — | — |\n')
  if (!align.ok) ok('C2 对齐行既无指向也无编号红')
  else bad('C2 对齐行既无指向也无编号红', '未报缺')

  const own = runOwnershipTypes('## 文件：G.tsx\n\n| 区间 | 元素 | 类型 |\n|---|---|---|\n| L1-L9 | D-U-01 | 乱写 |\n')
  if (!own.ok) ok('OWNERSHIP 类型非法 → 红')
  else bad('OWNERSHIP 类型非法 → 红', '未报非法类型')

  // resolveAnchors 直接返回问题清单（数组），不是 {ok}
  const anchorBad = resolveAnchors([{ file: 'packages/web/src/nope-ghost.ts', line: 12 }], root)
  if (Array.isArray(anchorBad) && anchorBad.length > 0) ok('SPECS 锚点指向不存在的文件 → 红')
  else bad('SPECS 锚点指向不存在的文件 → 红', JSON.stringify(anchorBad))
}

console.log(
  `\n${failures.length ? `\u274c ${failures.length} 个失败 / ${pass} 个通过` : `\u2705 ${pass} 个断言全部通过`}`,
)

if (failures.length) {
  console.log(failures.map((f) => `- ${f}`).join('\n'))
  process.exit(1)
}
