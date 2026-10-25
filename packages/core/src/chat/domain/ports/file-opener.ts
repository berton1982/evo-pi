/**
 * @design P-C-03
 * 文件打开：工具块里的路径点击要交给"打开文件"这件事，而不是组件自己拼 URL。
 */
export interface FileOpener {
  open(input: {
    cwd: string
    path: string
    line?: number
  }): Promise<{ ok: boolean; error?: string }>
}
