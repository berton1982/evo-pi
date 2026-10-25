import type { WorkspaceEntry } from '../workspace-entry'

/**
 * 读目录（端口）。
 *
 * 只有两个方法：列一层、取一层里某个子目录。**不做递归**——递归由 UI 按需展开，
 * 否则一个大仓库首次渲染就要几万条（pi-web 的文件树也是按需展开的）。
 */
export interface FilesRepository {
  list(
    cwd: string,
    path: string,
    opts?: { showIgnored?: boolean },
  ): Promise<{ entries: WorkspaceEntry[]; error?: { code: string; message?: string } }>
}
