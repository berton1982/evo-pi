'use client'

import { CheckIcon, EyeIcon, RefreshCwIcon, UploadIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'

/**
 * FilesToolbar — 4 buttons (upload / refresh / show-ignored / changed)
 * (per spec §4.2.1 Files panel).
 *
 * Phase 0 按钮可点击但只 console.log——Phase 5/6 (file capability) 接真实逻辑。
 */
interface FilesToolbarProps {
  showIgnored: boolean
  changedFilter: boolean
  onUpload: () => void
  onRefresh: () => void
  onToggleIgnored: () => void
  onToggleChanged: () => void
}

export function FilesToolbar({
  showIgnored,
  changedFilter,
  onUpload,
  onRefresh,
  onToggleIgnored,
  onToggleChanged,
}: FilesToolbarProps): React.JSX.Element {
  return (
    <div className="flex shrink-0 gap-1 border-b p-2" data-component="files-toolbar">
      <Button
        size="icon-sm"
        variant="ghost"
        onClick={onUpload}
        aria-label="upload"
        data-action="files-upload"
      >
        <UploadIcon className="size-4" />
      </Button>
      <Button
        size="icon-sm"
        variant="ghost"
        onClick={onRefresh}
        aria-label="refresh"
        data-action="files-refresh"
      >
        <RefreshCwIcon className="size-4" />
      </Button>
      <Button
        size="icon-sm"
        variant={showIgnored ? 'secondary' : 'ghost'}
        onClick={onToggleIgnored}
        aria-label="show ignored"
        aria-pressed={showIgnored}
        data-action="files-toggle-ignored"
      >
        <EyeIcon className="size-4" />
      </Button>
      <Button
        size="icon-sm"
        variant={changedFilter ? 'secondary' : 'ghost'}
        onClick={onToggleChanged}
        aria-label="changed only"
        aria-pressed={changedFilter}
        data-action="files-toggle-changed"
      >
        <CheckIcon className="size-4" />
      </Button>
    </div>
  )
}
