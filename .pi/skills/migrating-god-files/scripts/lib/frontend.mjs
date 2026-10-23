// 前端架构约定门（P2.5）。
//
// 为什么需要单独一门：后端已经有 Clean Architecture 的既有约束（core 四层 +
// rules.json 的 layerOrder/forbiddenEdges），前端却没有对应物——试点里
// "状态唯一归属""子组件不读 store""三态"这些判断，全靠 C4 的 D3/D12 事后
// 兜，而 P2.5 阶段的 web 侧规则几乎是空的。结果是：后端契约清楚，前端靠默契。
//
// 这一门检查两件事（都是"写下来就能判"的）：
//   1. `arch/frontend.md` 有 8 个约定小节（分层/状态/数据/三态/组件/样式/可访问/测试）；
//   2. `arch/rules.json#frontend` 把这些约定变成可引用的规则对象（层级、状态分类、
//      禁止写法、预算数字），供 D6/D10/D12 与 C5 质量门引用。

import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { readText } from './tables.mjs'

// 小节标题允许带编号与括注（`## 2. 状态的分类与归属（谁来持有）`），用前缀匹配。
const SECTIONS = [
  ['分层与目录', '前端有哪些层、目录怎么摆、谁能 import 谁'],
  ['状态的分类与归属', '每类状态存在哪（URL / store / 服务端缓存 / 组件内），谁是唯一持有者'],
  ['数据获取与缓存', '谁发起请求、在哪失效、loading/refetch 怎么表达'],
  ['三态与错误', 'loading / empty / error 三态与错误分类（可重试 / 不可恢复 / 用户可修）'],
  ['组件与 props', '容器 vs 展示、props 上限、回调 vs store、组件不读全局状态'],
  ['样式与 token', 'style/token 的唯一来源、禁止内联 hex、响应式断点'],
  ['可访问性与键盘', 'role/aria 由原语承担、焦点管理、快捷键作用域'],
  ['测试与预算', '测试分层（单元/组件/e2e）与性能预算（首屏、切换、流式）'],
]

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v)
const text = (v) => String(v ?? '').trim()

export function runFrontendArch({ programDir, rules }) {
  const md = readText(resolve(programDir, 'arch/frontend.md'))
  const problems = []

  if (md === null) {
    problems.push(
      '缺 arch/frontend.md——前端架构约定没有落盘（模板 references/templates/frontend-arch.md）',
    )
  } else {
    const missing = SECTIONS.filter(
      ([name]) => !new RegExp(`^#{2,3}\\s*[0-9.、]*\\s*${name}`, 'm').test(md),
    )
    if (missing.length)
      problems.push(
        `arch/frontend.md 缺 ${missing.length} 个小节：${missing.map(([n]) => n).join('、')}`,
      )
    if (md.trim().length < 600)
      problems.push(
        `arch/frontend.md 只有 ${md.trim().length} 字——八个约定写不到 600 字说明还是口号`,
      )
  }

  const fe = isObj(rules?.frontend) ? rules.frontend : null
  if (!fe) {
    problems.push(
      'arch/rules.json 缺 `frontend` 对象——前端的约定必须变成可引用的规则，不能只在散文里',
    )
    return { ok: false, detail: problems.join('；') }
  }

  const layers = Array.isArray(fe.layers) ? fe.layers.filter((l) => text(l)) : []
  if (layers.length < 3)
    problems.push('`frontend.layers` 至少 3 层（如 ui / features / shared-kernel）')

  const classes = Array.isArray(fe.stateClasses) ? fe.stateClasses : []
  if (classes.length < 3)
    problems.push(
      '`frontend.stateClasses` 至少 3 类（如 server / url / store / ephemeral），否则"状态归属"无从判断',
    )
  for (const c of classes) {
    if (!isObj(c) || !text(c.name)) {
      problems.push('`frontend.stateClasses[]` 每项需要 name')
      continue
    }
    if (text(c.rule).length < 10) problems.push(`状态类「${c.name}」的 rule 说不清怎么判（<10 字）`)
    if (!text(c.forbidden)) problems.push(`状态类「${c.name}」缺 forbidden（典型写错的形态）`)
  }

  const forbidden = Array.isArray(fe.forbidden) ? fe.forbidden.filter((f) => text(f)) : []
  if (!forbidden.length)
    problems.push('`frontend.forbidden` 为空——前端最常见的错是"哪里都能写"，必须列出禁止写法')

  const budgets = isObj(fe.budgets) ? fe.budgets : null
  if (!budgets) problems.push('`frontend.budgets` 缺数字预算（首屏 / 切换 / 流式帧）')
  else {
    const nums = Object.entries(budgets).filter(([, v]) => typeof v === 'number' && v > 0)
    if (!nums.length) problems.push('`frontend.budgets` 里没有正数——预算是数字，不是形容词')
  }

  if (existsSync(resolve(programDir, 'arch/frontend.md')) && !text(fe.doc))
    problems.push('`frontend.doc` 缺指向（应为 `arch/frontend.md`，供其他门引用）')

  const detail =
    problems.join('；') ||
    `前端约定 ${SECTIONS.length} 节齐备；${layers.length} 层 / ${classes.length} 类状态 / ${forbidden.length} 条禁止写法 / ${Object.keys(budgets || {}).length} 项预算`
  return { ok: problems.length === 0, detail }
}

export { SECTIONS as FRONTEND_SECTIONS }
