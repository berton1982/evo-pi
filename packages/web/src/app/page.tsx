import { Suspense } from 'react'
import { SessionSurface } from './session-surface'

/**
 * 入口页 = 壳本身（不再 redirect）。
 *
 * pi-web 的入口就是 AppShell：没有"首页→某路由"这一跳，选中态与 `cwd` 都在 URL 上。
 * 这条规矩由技能的 `shellMount` 门看住（不许只做 redirect）。
 */
export default function RootPage(): React.JSX.Element {
  return (
    <Suspense fallback={null}>
      <SessionSurface />
    </Suspense>
  )
}
