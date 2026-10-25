/**
 * 工作区目录项（文件树的一行）。
 *
 * 只保留"界面上要显示、排序、过滤"的字段：名称、相对路径、种类、大小/时间。
 * 不在域里放 `Dirent`/`Stats` 这类 node 类型——那是 infrastructure 的事，
 * 否则 use-case 与测试都得依赖 fs 才能构造数据。
 */
export interface WorkspaceEntry {
  name: string
  /** 相对工作区根的路径（POSIX 分隔符，便于跨平台比较与拼 URL） */
  path: string
  kind: 'dir' | 'file'
  size?: number
  mtimeMs?: number
}

export const entrySortKey = (e: WorkspaceEntry): [number, string] => [
  // 目录永远在前，然后按名字（大小写不敏感，中文按 code point 兜底）
  e.kind === 'dir' ? 0 : 1,
  e.name.toLowerCase(),
]

export const sortEntries = (list: readonly WorkspaceEntry[]): WorkspaceEntry[] =>
  [...list].sort((a, b) => {
    const [ka, na] = entrySortKey(a)
    const [kb, nb] = entrySortKey(b)
    return ka - kb || na.localeCompare(nb)
  })
