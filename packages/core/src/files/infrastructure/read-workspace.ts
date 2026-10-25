import { readdir, stat } from 'node:fs/promises'
import { join, relative } from 'node:path'
import type { FilesRepository } from '../domain/ports/files-repository'
import type { WorkspaceEntry } from '../domain/workspace-entry'

/**
 * 默认忽略的目录：不是"用户不关心"，而是"展开它们会让文件树不可用"
 * （`.git` 几万文件、`node_modules` 更甚）。`showIgnored` 时只放开点开头目录，
 * `node_modules` 仍然排除——它永远不是用户要找的东西。
 */
const ALWAYS_IGNORED = new Set(['node_modules', '.next', 'dist'])
const MAX_ENTRIES = 2000

export function createFsFilesRepository(): FilesRepository {
  return {
    async list(cwd, path, opts) {
      const abs = path ? join(cwd, path) : cwd
      try {
        const dirents = await readdir(abs, { withFileTypes: true })
        const entries: WorkspaceEntry[] = []
        for (const d of dirents.slice(0, MAX_ENTRIES)) {
          if (ALWAYS_IGNORED.has(d.name)) continue
          const isHidden = d.name.startsWith('.')
          if (isHidden && !opts?.showIgnored) continue
          const full = join(abs, d.name)
          const rel = relative(cwd, full).split('\\').join('/')
          let size: number | undefined
          let mtimeMs: number | undefined
          if (d.isFile()) {
            try {
              const st = await stat(full)
              size = st.size
              mtimeMs = st.mtimeMs
            } catch {
              // 读不到元信息不该让整层失败：显示文件名，大小未知
            }
          }
          entries.push({
            name: d.name,
            path: rel,
            kind: d.isDirectory() ? 'dir' : 'file',
            size,
            mtimeMs,
          })
        }
        return { entries }
      } catch (err) {
        const e = err as NodeJS.ErrnoException
        const code = e.code === 'ENOENT' ? 'not-found' : e.code === 'EACCES' ? 'denied' : 'internal'
        return { entries: [], error: { code, message: e.message } }
      }
    },
  }
}
