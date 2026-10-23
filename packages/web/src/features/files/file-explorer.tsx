'use client'

/**
 * FileExplorer — Phase 0 placeholder (per spec §4.2.5).
 *
 * Phase 5 (file capability) 替换为：
 * - 真实 file tree（基于 read / ls tools）
 * - expand/collapse folder
 * - click 选中文件（打开 FileViewer）
 */
export function FileExplorer(): React.JSX.Element {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-2" data-component="file-explorer-placeholder">
      <div className="flex flex-col gap-1">
        {Array.from({ length: 5 }, (_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholders are stable order
          <div key={i} className="flex items-center gap-2 py-1 text-xs">
            <div className="bg-muted-foreground/20 h-3 w-3 rounded" aria-hidden />
            <div className="bg-muted-foreground/20 h-3 flex-1 rounded" aria-hidden />
          </div>
        ))}
      </div>
    </div>
  )
}
