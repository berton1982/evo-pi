'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useI18n } from '@/shell/frame/i18n-provider'
import {
  shortPath,
  useProjects,
  useProjectVersion,
  validateProjectPath,
} from '@/shell/orchestration/use-projects'

/**
 * 当前项目按钮 + 切换面板（壳级）。
 *
 * 与 pi-web 对齐的要点：按钮显示**当前项目名**（不是"设置"），点开是项目清单 +
 * "打开其他项目…"；切换只改 URL 的 `cwd`（选中态与 cwd 一直以 URL 为唯一事实源）。
 *
 * 为什么不用下拉菜单：仓库里已经没有 dropdown-menu 原语（清掉了未使用组件），
 * 也不再为这一处引入新的依赖——用已有的 Dialog 表达"选一个项目"同样清楚，
 * 且键盘/读屏路径与设置弹窗完全一致（少一套焦点管理代码）。
 */
export function ProjectPicker({
  cwd,
  onPick,
  onNewSession,
}: {
  cwd: string | null
  onPick: (next: string) => void
  onNewSession?: () => void
}): React.JSX.Element {
  const { t } = useI18n()
  const { projects, open, setOpen, reload } = useProjects(cwd)
  const version = useProjectVersion()
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const label = cwd ? shortPath(cwd) : t('project.none')

  async function onOpen(path: string): Promise<void> {
    const problem = await validateProjectPath(path)
    if (problem) {
      setError(t('project.invalid'))
      return
    }
    setError(null)
    onPick(path.trim())
    setOpen(false)
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="max-w-[10rem] truncate"
        // 可及名只放「项目名」：把版本拼进同一个名字是假对齐（fidelity 的「信息融合」判据会红）。
        // 版本信息放在按钮**外面**的独立节点里，读屏照样拿得到，但它是另一段信息。
        aria-label={label}
        title={cwd ?? undefined}
        onClick={() => setOpen(true)}
        data-action="project-picker"
      >
        {label}
      </Button>
      {version ? (
        <span data-testid="project-version" className="sr-only">
          {`${t('project.version')}：web ${version.web}，core ${version.core}`}
        </span>
      ) : null}
      {open ? (
        <Dialog open onOpenChange={setOpen}>
          <DialogContent data-section="project-picker" className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t('project.switch')}</DialogTitle>
            </DialogHeader>
            <ul className="flex flex-col gap-1">
              {projects.map((p) => (
                <li key={p}>
                  <Button
                    type="button"
                    variant={p === cwd ? 'secondary' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => {
                      onPick(p)
                      setOpen(false)
                    }}
                    aria-current={p === cwd ? 'true' : undefined}
                  >
                    <span className="truncate">{shortPath(p)}</span>
                    <span className="text-muted-foreground ml-2 truncate text-xs">{p}</span>
                  </Button>
                </li>
              ))}
              {projects.length === 0 ? (
                <li className="text-muted-foreground text-xs">{t('project.empty')}</li>
              ) : null}
            </ul>

            {/* 打开其他项目：手输路径 + 真校验（读得到目录才算），不是"点了没反应" */}
            <form
              className="flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                void onOpen(draft)
              }}
            >
              <input
                className="border-input bg-background h-8 min-w-0 flex-1 rounded-md border px-2 text-xs"
                placeholder={t('project.openHint')}
                aria-label={t('project.open')}
                aria-invalid={error ? true : undefined}
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value)
                  setError(null)
                }}
              />
              <Button type="submit" size="sm" variant="secondary">
                {t('project.open')}
              </Button>
            </form>
            {error ? (
              <p className="text-destructive text-xs" role="alert">
                {error}
              </p>
            ) : null}

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={!cwd}
                  onClick={() => {
                    if (!cwd) return
                    void navigator.clipboard.writeText(cwd).then(() => {
                      setCopied(true)
                      window.setTimeout(() => setCopied(false), 1500)
                    })
                  }}
                >
                  {copied ? t('project.copied') : t('project.copy')}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={!onNewSession || !cwd}
                  onClick={onNewSession}
                >
                  {t('project.newSession')}
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={reload}>
                  {t('project.reload')}
                </Button>
              </div>
              <span className="text-muted-foreground text-xs" data-testid="project-version">
                {version ? `web ${version.web} · core ${version.core}` : ''}
              </span>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  )
}
