/**
 * 环境矩阵（P6）—— 把"跑起来要什么"从脑子里搬到文档里，并且可判。
 *
 * 起因（C-G 试点实测）：三件事各花掉一段时间，且都不是代码问题——
 *  1) 包内 node_modules 的 typescript 是 7.0.2 原生发行版（不带 tsserver.js），
 *     LSP 全挂，我一度把根因写成"ref_projects 不在 tsconfig 里"；
 *  2) `next dev` + StrictMode + HMR 让 effect 反复挂载，页面永远空，白排查约 2 小时；
 *  3) `PI_CODING_AGENT_DIR` 不隔离会直接写用户真实 `~/.pi/agent`。
 *
 * 判据只做"结构 + 必需键"：真正的连通性探测是 `harness` 的事，这里不假装能测环境。
 */
import { parseTables, stripCell } from './tables.mjs'

export const REQUIRED_SECTIONS = [
  '端口与进程',
  '环境变量',
  '构建与运行',
  '工具链版本',
  '夹具与隔离',
]

/** 必须出现的具体键：漏一个就说明有人要靠猜。 */
export const REQUIRED_KEYS = [
  'PI_CODING_AGENT_DIR',
  '30041',
  '30141',
  'tsserver',
  'next start',
]

export function checkEnvDoc(text) {
  if (!text || !text.trim()) {
    return { ok: false, problems: ['缺 `environment.md`——端口/变量/构建方式必须成文'] }
  }
  const problems = []
  const missingSections = REQUIRED_SECTIONS.filter((sec) => !text.includes(sec))
  if (missingSections.length) {
    problems.push(`缺小节：${missingSections.join('、')}`)
  }
  const missingKeys = REQUIRED_KEYS.filter((k) => !text.includes(k))
  if (missingKeys.length) {
    problems.push(`缺具体条目：${missingKeys.join('、')}（写清楚才能照着跑）`)
  }
  // 必须有一张「项 / 值 / 说明」表，避免写成散文
  // 五节各一张小表是正常写法，所以按"所有 项/值 表的总行数"算，而不是只看第一张
  const envTables = parseTables(text).filter((x) => {
    const hs = x.header.map((h) => stripCell(h))
    return hs.some((h) => /值/.test(h)) && hs.some((h) => /项|变量|端口/.test(h))
  })
  const envRows = envTables.reduce(
    (n, t) => n + t.rows.filter((r) => r.some((c) => stripCell(c))).length,
    0,
  )
  if (!envTables.length) problems.push('缺「项 / 值 / 说明」表——散文写不清端口和变量的对应关系')
  else if (envRows < 5) problems.push(`环境表合计 ${envRows} 行 < 5（端口/变量/构建/版本/夹具各要一行）`)
  return {
    ok: problems.length === 0,
    problems,
    detail: `环境矩阵 ${REQUIRED_SECTIONS.length} 节齐备、关键条目 ${REQUIRED_KEYS.length} 项在册`,
  }
}
