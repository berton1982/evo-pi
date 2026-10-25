/**
 * @design D-B-06 manageProfiles：子代理档案读写
 *
 * 用例层只做校验与编排；文件格式解析在 infrastructure（D-A-02/D-A-03）。
 * 端口签名直接照实（`list` 返回数组、`save` 返回 void、`remove` 返回 boolean），
 * 不在这里再包一层 Outcome——重复的"成功/失败"两种表达只会让人不知道看哪个。
 */
import type { SubagentProfile, SubagentProfiles } from '../domain/ports/subagent-profiles'

export type ProfileError = { code: string; message?: string }

export function createManageProfiles(deps: { profiles: SubagentProfiles }): {
  list: (cwd?: string) => Promise<{ profiles: SubagentProfile[]; error: ProfileError | null }>
  save: (profile: SubagentProfile, cwd?: string) => Promise<ProfileError | null>
  remove: (name: string, cwd?: string) => Promise<{ removed: boolean; error: ProfileError | null }>
} {
  return {
    list: async (cwd) => {
      try {
        return { profiles: await deps.profiles.list(cwd ? { cwd } : undefined), error: null }
      } catch (cause) {
        return { profiles: [], error: { code: 'list-failed', message: String(cause) } }
      }
    },
    save: async (profile, cwd) => {
      // 名字就是文件名：带 `/` 或 `..` 会写到目录外
      if (!profile.name?.trim() || /[/\\]|\.\./.test(profile.name))
        return { code: 'invalid-name', message: profile.name }
      try {
        await deps.profiles.save(profile, cwd ? { cwd } : undefined)
        return null
      } catch (cause) {
        return { code: 'save-failed', message: String(cause) }
      }
    },
    remove: async (name, cwd) => {
      if (!name.trim()) return { removed: false, error: { code: 'invalid-name' } }
      try {
        return { removed: await deps.profiles.remove(name, cwd ? { cwd } : undefined), error: null }
      } catch (cause) {
        return { removed: false, error: { code: 'remove-failed', message: String(cause) } }
      }
    },
  }
}
