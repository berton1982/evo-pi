'use client'

/**
 * 文件标签页（能力内部实现）：工具栏 + 文件树。
 *
 * 工作区选择器（WorkspacePanel）不在这里：它属于 workspaces 能力，
 * 由装配点 `app/left-zone.tsx` 一起放进 files 标签页的槽位——能力之间不许互相 import。
 */
import { useState } from 'react'

import { useI18n } from '@/shell/frame/i18n-provider'
import { FileExplorer } from './file-explorer'
import { FilesToolbar } from './files-toolbar'
import { useWorkspaceFiles } from './use-workspace-files'

export function FilesPanel({ cwd }: { cwd: string | null }): React.JSX.Element {
  const [showIgnored, setShowIgnored] = useState(false)
  const [changedFilter, setChangedFilter] = useState(false)
  // 搜索框是本地过滤（不是再请求一次后端）：同一次 list 的结果按名字过滤，
  // 输入即过滤，避免每敲一个字打一次 /api/cwd/files
  const [searchQuery, setSearchQuery] = useState('')
  const { t } = useI18n()
  const state = useWorkspaceFiles(cwd, { showIgnored })

  return (
    <section
      // 文件区是地标：<section> 自带 region 语义，再用 role="region" 属冗余
      aria-label={t('files.region')}
      className="flex h-full flex-col"
      data-component="files-tab"
    >
      <FilesToolbar
        flags={{ showIgnored, changedFilter }}
        search={{ value: searchQuery, onChange: setSearchQuery }}
        actions={{
          // 上传要写入工作区根目录，本轮没接（不是忘了：写盘动作用户得先确认路径）
          onUpload: undefined,
          onRefresh: state.refresh,
          onToggleIgnored: () => {
            setShowIgnored((v) => !v)
          },
          onToggleChanged: () => {
            setChangedFilter((v) => !v)
          },
        }}
      />
      <FileExplorer cwd={cwd} state={state} filter={searchQuery} />
    </section>
  )
}
