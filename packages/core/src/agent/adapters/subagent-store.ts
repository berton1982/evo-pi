/**
 * @design D-A-04
 * 子代理存储适配器：把"目录在哪"这件事从实现里挪出来。
 *
 * 端口只谈语义（list/save/remove），目录解析属于装配：
 * 全局档案在 `<agentDir>/subagents`，项目档案在 `<cwd>/.pi/subagents`，
 * 两者合并顺序由调用方决定（项目优先），实现不猜。
 */

import type { SubagentProfile, SubagentProfiles } from '../domain/ports/subagent-profiles'
import { createFsSubagentProfiles } from '../infrastructure/subagent-profiles'

export interface SubagentStoreOptions {
  /** 全局档案目录（通常 `<agentDir>/subagents`）。 */
  globalDir: () => string
  /** 项目档案目录（通常 `<cwd>/.pi/subagents`）；没有项目时返回 null。 */
  projectDir?: () => string | null
}

export function createSubagentStore({
  globalDir,
  projectDir,
}: SubagentStoreOptions): SubagentProfiles {
  const globalStore = createFsSubagentProfiles(globalDir)
  const projectStore = projectDir
    ? createFsSubagentProfiles(() => projectDir() ?? globalDir())
    : null

  return {
    async list() {
      const [globals, projects] = await Promise.all([
        globalStore.list(),
        projectStore?.list() ?? Promise.resolve([] as SubagentProfile[]),
      ])
      // 项目档案覆盖同名全局档案：改项目里的定义不该被全局那份盖回去
      const byName = new Map(globals.map((p) => [p.name, p]))
      for (const p of projects) byName.set(p.name, p)
      return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name))
    },
    async save(profile) {
      // 写到项目目录（有则用），因为用户改的通常是"这个项目的子代理"
      if (projectDir?.()) return projectStore?.save(profile)
      return globalStore.save(profile)
    },
    async remove(name) {
      const removedProject = projectDir?.() ? await projectStore?.remove(name) : false
      if (removedProject) return true
      return globalStore.remove(name)
    },
  }
}
