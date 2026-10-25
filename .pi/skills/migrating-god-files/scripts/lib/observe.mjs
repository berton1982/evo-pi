/**
 * 实施前的"观察"门 —— 把「打开 pi-web 看一眼它到底长什么样」变成步骤，而不是自觉。
 *
 * 为什么要有这道门（实测来源）：
 *   20261024-web-recal 的 D-2 里，我们对着**可及树 dump** 改代码，结果干出了
 *   `名称，版本：web x，core y` 这种把三层信息压进一个读屏名的"对齐"——
 *   dump 里看不出 pi-web 是"标题 + 副标题 + 状态点"三个节点。字符级比较是绿的，
 *   人眼一看就知道不对。那次"观察"是我自发的，流程里没有这一步，也就无法保证
 *   下一个人还会看。
 *
 * 判据（三道，全部机器可验）：
 *   1. 每个 UI 任务（plans 里 `设计元素` 指向 component/hook/store 的行）必须有
 *      `observations/<任务 id>.md`；
 *   2. 该文件必须有三段且非空：`## 看到什么`（pi-web 的实际结构）/`## 差在哪`/`## 决定`；
 *   3. `## 看到什么` 必须给出**可核对的定位**（`pi-web` 路径 + 行号，或 30141 上的
 *      选择器/流程描述 ≥20 字），防止写"看了一下，差不多"。
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const HEADINGS = ['## 看到什么', '## 差在哪', '## 决定']

export function observationsDir(runDir) {
  return join(runDir, 'observations')
}

/** 只挑"有界面的"任务：`parsePlans` 出来的任务里，`design` 指向 D-/C-/H-/ST- 的那些。 */
export function uiTasks(parsed) {
  const list = Array.isArray(parsed) ? parsed : parsed?.tasks || []
  const out = []
  for (const t of list) {
    if (!t || !t.id) continue
    const els = [].concat(t.design || [])
    if (!els.length) continue
    // 只把"真的会画出界面"的任务算进来：元素里必须有组件/hook/store（C-/H-/ST-）。
    // 起源：C-A 是 7,669 行的运行时，任务全都指向 D-* 域元素，却被要求写 4 份"界面观察"——
    // 那是逼人编（"这一屏左边有什么"对一个没有屏的模块毫无意义）。
    if (!els.some((x) => /^(?:C|H|ST)-/.test(String(x)))) continue
    out.push({ id: t.id, plan: t.file || '', elements: els.join(' ') })
  }
  return out
}

export function parseObservation(text) {
  const body = String(text || '')
  const sections = {}
  for (const h of HEADINGS) {
    const i = body.indexOf(h)
    if (i < 0) {
      sections[h] = null
      continue
    }
    const after = body.slice(i + h.length)
    const next = after.search(/\n## /)
    sections[h] = (next < 0 ? after : after.slice(0, next)).trim()
  }
  return sections
}

/** 已 done 的任务不追溯：代码已经写完，观察补不出来，逼人补就是造假。 */
const doneIds = (state) => {
  // state.tasks 可能是数组（新）也可能是 map（历史 run），两种都认
  const t = state?.tasks
  const list = Array.isArray(t)
    ? t
    : Object.entries(t || {}).map(([id, v]) => ({ id, ...(v || {}) }))
  return new Set(list.filter((x) => x && x.status === 'done').map((x) => x.id))
}

export function checkObservations({ runDir, plans, state }) {
  const done = doneIds(state)
  const tasks = uiTasks(plans).filter((t) => !done.has(t.id))
  const problems = []
  const missing = []
  let seen = 0
  for (const t of tasks) {
    const f = join(observationsDir(runDir), `${t.id}.md`)
    if (!existsSync(f)) {
      missing.push(t.id)
      continue
    }
    seen++
    const s = parseObservation(readFileSync(f, 'utf8'))
    for (const h of HEADINGS) {
      if (s[h] === null) problems.push(`${t.id}: 缺小节「${h.replace('## ', '')}」`)
      else if (s[h].length < 20)
        problems.push(
          `${t.id}:「${h.replace('## ', '')}」只有 ${s[h].length} 字——写不出结构说明等于没看`,
        )
    }
    const saw = s['## 看到什么'] || ''
    // 定位：源码锚点（路径 + 行号）或 30141 上的选择器/流程描述
    const anchored =
      /[\w@./-]+\.(?:tsx?|jsx?|css):\d+/.test(saw) ||
      /(30141|选择器|弹窗|分区|工具栏|列表项|空态)/.test(saw)
    if (!anchored)
      problems.push(
        `${t.id}:「看到什么」缺可核对的定位（源码 路径:行号，或写清你在 30141 上看到的是弹窗/分区/列表项…）`,
      )
  }
  if (tasks.length && missing.length)
    problems.push(
      `${missing.length}/${tasks.length} 个界面任务没做观察：${missing.slice(0, 4).join(', ')}`,
    )
  return {
    id: 'OBS',
    ok: problems.length === 0,
    problems,
    totals: { uiTasks: tasks.length, observed: seen },
  }
}
