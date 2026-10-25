'use client'

import {
  CheckIcon,
  EyeIcon,
  FolderOpenIcon,
  RefreshCwIcon,
  TerminalIcon,
  UploadIcon,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useI18n } from '@/shell/frame/i18n-provider'

/**
 * 文件区工具栏（与 pi-web 的 `group:文件操作` 对齐）。
 *
 * 三个按钮在这里是 **disabled + title 写明缺什么**：终端、文件管理器、上传都需要
 * 新的后端能力（PTY / xdg-open / multipart）。pi-web 有它们是因为 `lib/` 里早有这些
 * 通道；我们还没有，所以按钮留着占位但如实标"没实现"——不做点了没反应的假按钮
 * （P7 保真门把"元素存在"与"功能存在"分开记，这条差异登记在 shell-fidelity.md）。
 */
interface FilesToolbarProps {
  /** 开关类状态（都是布尔或计数，一起传才不会一路加到 9 个 props） */
  flags: { showIgnored: boolean; changedFilter: boolean; changedCount?: number }
  search: { value: string; onChange: (q: string) => void }
  actions: {
    onUpload?: () => void
    onRefresh: () => void
    onToggleIgnored: () => void
    onToggleChanged: () => void
  }
}

export function FilesToolbar({ flags, search, actions }: FilesToolbarProps): React.JSX.Element {
  const { t } = useI18n()
  const { showIgnored, changedFilter } = flags
  const count = flags.changedCount ?? 0

  return (
    <div
      className="flex shrink-0 items-center gap-1 border-b p-2"
      data-component="files-toolbar"
      role="toolbar"
      aria-label={t('files.group')}
    >
      <Button
        size="icon-sm"
        variant="ghost"
        disabled
        title={t('files.blocked.terminal')}
        aria-label={t('files.terminal')}
        data-action="files-terminal"
      >
        <TerminalIcon className="size-4" />
      </Button>
      <Button
        size="icon-sm"
        variant="ghost"
        disabled
        title={t('files.blocked.manager')}
        aria-label={t('files.openInManager')}
        data-action="files-open-manager"
      >
        <FolderOpenIcon className="size-4" />
      </Button>
      <Button
        size="icon-sm"
        variant="ghost"
        onClick={actions.onUpload}
        disabled={!actions.onUpload}
        title={actions.onUpload ? t('files.uploadToRoot') : t('files.blocked.upload')}
        aria-label={t('files.uploadToRoot')}
        data-action="files-upload"
      >
        <UploadIcon className="size-4" />
      </Button>
      <Button
        size="icon-sm"
        variant="ghost"
        onClick={actions.onRefresh}
        title={t('files.refresh')}
        aria-label={t('files.refresh')}
        data-action="files-refresh"
      >
        <RefreshCwIcon className="size-4" />
      </Button>
      <Button
        size="icon-sm"
        variant={showIgnored ? 'secondary' : 'ghost'}
        onClick={actions.onToggleIgnored}
        title={t('files.ignored')}
        aria-label={t('files.ignored')}
        aria-pressed={showIgnored}
        data-action="files-toggle-ignored"
      >
        <EyeIcon className="size-4" />
      </Button>
      <Button
        size="icon-sm"
        variant={changedFilter ? 'secondary' : 'ghost'}
        onClick={actions.onToggleChanged}
        title={t('files.changedCount', { count })}
        aria-label={`${count} ${t('files.changedLabel')}`}
        aria-pressed={changedFilter}
        data-action="files-toggle-changed"
      >
        <CheckIcon className="size-4" />
      </Button>
      <input
        className="border-input bg-background ml-auto h-7 min-w-0 flex-1 rounded-md border px-2 text-xs"
        placeholder={t('files.search')}
        aria-label={t('files.search')}
        value={search.value}
        onChange={(e) => {
          search.onChange(e.target.value)
        }}
        data-action="files-search"
      />
    </div>
  )
}
