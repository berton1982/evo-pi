import type { FilesRepository } from '../domain/ports/files-repository'
import { sortEntries, type WorkspaceEntry } from '../domain/workspace-entry'

export interface ListWorkspaceDeps {
  repository: FilesRepository
}

export interface ListWorkspaceInput {
  cwd: string
  /** 相对路径，`''` 表示根 */
  path?: string
  showIgnored?: boolean
}

/**
 * 列一层目录（用例）。
 *
 * 失败时返回错误对象而不是抛：文件树是"辅助信息"，读失败要能显示"读不了，因为…"，
 * 而不是让整页白屏（这与 `test-server` 等动作的约定一致）。
 */
export function createListWorkspace(deps: ListWorkspaceDeps) {
  return {
    async list(input: ListWorkspaceInput): Promise<{
      entries: WorkspaceEntry[]
      error?: { code: string; message?: string }
    }> {
      const rel = (input.path ?? '').replace(/^\/+|\/+$/g, '')
      const res = await deps.repository.list(input.cwd, rel, {
        showIgnored: input.showIgnored ?? false,
      })
      if (res.error) return { entries: [], error: res.error }
      return { entries: sortEntries(res.entries) }
    },
  }
}
