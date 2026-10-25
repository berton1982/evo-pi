'use client'

/**
 * @design D-U-14
 * 并排 diff：行来自 `@evo-pi/core/chat` 的 `splitPatch`（与服务端写盘同一套解析）。
 *
 * 行号一律 null 除非解析器给了——编一个假行号会让人以为能点跳转。
 */
import { splitPatch } from '@evo-pi/core/chat'

export function SplitDiff({ patch }: { patch: string }): React.JSX.Element | null {
  const files = splitPatch(patch)
  if (files.length === 0) return null
  return (
    <div data-testid="chat-split-diff" className="my-1 space-y-1">
      {files.map((file) => (
        <div key={file.filePath} className="rounded border border-border">
          <div className="border-border border-b px-2 py-1 font-mono text-[11px]">
            {file.operation} {file.filePath}
          </div>
          <table className="w-full table-fixed font-mono text-[11px]">
            <tbody>
              {file.rows.map((row, rowIndex) => {
                // diff 行没有 id：行序就是位置（左右两栏共用同一个序号），流式过程中只追加
                const lineKey = `${file.filePath}-${rowIndex}`
                if (row.type === 'header') {
                  return (
                    <tr key={`${lineKey}-header`} className="bg-muted">
                      <td className="px-1 font-mono text-[11px]" colSpan={2}>
                        {row.text}
                      </td>
                    </tr>
                  )
                }
                const tone = (cell: typeof row.left) =>
                  cell.type === 'removed'
                    ? 'bg-destructive/10'
                    : cell.type === 'added'
                      ? 'bg-emerald-500/10'
                      : ''
                return (
                  <tr key={lineKey}>
                    <td
                      className={`w-1/2 border-border border-r px-1 align-top whitespace-pre-wrap ${tone(row.left)}`}
                    >
                      {row.left.text}
                    </td>
                    <td className={`w-1/2 px-1 align-top whitespace-pre-wrap ${tone(row.right)}`}>
                      {row.right.text}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}
