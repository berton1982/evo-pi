'use client'

/**
 * 文件标签页（能力内部实现）：工具栏 + 文件树。
 *
 * 工作区选择器（WorkspacePanel）不在这里：它属于 workspaces 能力，
 * 由装配点 `app/sessions/page.tsx` 一起放进 files 标签页的槽位——
 * 能力之间不许互相 import。
 */

import { useState } from 'react'
import { FileExplorer } from './file-explorer'
import { FilesToolbar } from './files-toolbar'

export function FilesPanel(): React.JSX.Element {
  const [showIgnored, setShowIgnored] = useState(false)
  const [changedFilter, setChangedFilter] = useState(false)

  return (
    <div className="flex h-full flex-col" data-component="files-tab">
      <FilesToolbar
        showIgnored={showIgnored}
        changedFilter={changedFilter}
        // 上传/刷新还没接后端：留空实现而不是假装成功
        onUpload={() => {}}
        onRefresh={() => {}}
        onToggleIgnored={() => {
          setShowIgnored((v) => !v)
        }}
        onToggleChanged={() => {
          setChangedFilter((v) => !v)
        }}
      />
      <FileExplorer />
    </div>
  )
}
