import { Suspense } from 'react'
import { SessionSurface } from '../session-surface'

/**
 * `/sessions` = 入口的别名路由。
 *
 * 保留它是为了已有深链（`/sessions?cwd=…`）不 404，但它与 `/` 渲染**同一个装配点**，
 * 所以不存在"两个入口两套行为"的可能。
 */
export default function SessionsPage(): React.JSX.Element {
  return (
    <Suspense fallback={null}>
      <SessionSurface />
    </Suspense>
  )
}
