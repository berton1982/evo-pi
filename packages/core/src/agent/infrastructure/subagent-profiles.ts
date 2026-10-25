/**
 * @design D-A-01
 * 子代理档案的落盘实现：`<name>.md` = frontmatter + 正文。
 *
 * 为什么自己解析 frontmatter 而不引 yaml 库：只需要 `key: value` 六种键，
 * 引一个解析器就要处理锚点/多行块/类型推断，出错时的报错还指向库内部。
 * 这里解析失败**抛出带文件名的错误**——静默返回空档案会让"保存成功"变成谎话。
 */
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { SubagentProfile, SubagentProfiles } from '../domain/ports/subagent-profiles'

const FRONTMATTER_KEYS = new Set(['name', 'description', 'model', 'tools', 'color', 'hidden'])

export function parseProfile(text: string, file = '<memory>'): SubagentProfile {
  if (!text.startsWith('---\n')) {
    throw new Error(`${file}: 缺 frontmatter（首行必须是 ---）`)
  }
  const end = text.indexOf('\n---', 4)
  if (end < 0) throw new Error(`${file}: frontmatter 没有闭合的 ---`)
  const head = text.slice(4, end)
  const body = text.slice(text.indexOf('\n', end + 1) + 1)
  const meta: Record<string, string> = {}
  for (const line of head.split('\n')) {
    const at = line.indexOf(':')
    if (at < 0) continue
    const key = line.slice(0, at).trim()
    if (!FRONTMATTER_KEYS.has(key)) continue
    meta[key] = line.slice(at + 1).trim()
  }
  if (!meta.name) throw new Error(`${file}: frontmatter 缺 name`)
  return { name: meta.name, description: meta.description, model: meta.model, body }
}

export function formatProfile(profile: SubagentProfile): string {
  const lines = ['---', `name: ${profile.name}`]
  if (profile.description) lines.push(`description: ${profile.description}`)
  if (profile.model) lines.push(`model: ${profile.model}`)
  lines.push('---', '')
  return `${lines.join('\n')}${profile.body.replace(/^\n+/, '')}\n`
}

/** 档案目录由调用方给（`~/.pi/agent/subagents` 或项目级），这里不猜全局路径。 */
export function createFsSubagentProfiles(dir: () => string): SubagentProfiles {
  return {
    async list() {
      let names: string[]
      try {
        names = readdirSync(dir())
      } catch {
        return [] // 目录不存在 = 没有档案，不是错误
      }
      const out: SubagentProfile[] = []
      for (const name of names) {
        if (!name.endsWith('.md')) continue
        try {
          out.push(parseProfile(readFileSync(join(dir(), name), 'utf8'), name))
        } catch {
          // 单个档案坏掉不该让整个列表失败，但也不能假装它不存在——用 name 占位
          out.push({ name: name.replace(/\.md$/, ''), body: '' })
        }
      }
      return out
    },
    async save(profile) {
      mkdirSync(dir(), { recursive: true })
      writeFileSync(join(dir(), `${profile.name}.md`), formatProfile(profile), 'utf8')
    },
    async remove(name) {
      try {
        rmSync(join(dir(), `${name}.md`))
        return true
      } catch {
        return false
      }
    },
  }
}
