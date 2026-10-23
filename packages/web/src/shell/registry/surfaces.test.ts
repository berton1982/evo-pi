import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { SHELL_SURFACES, surfaceIds, surfacesOf } from './surfaces'

// 用测试文件自身定位 src：`process.cwd()` 在 vitest 里是仓库根，不是 packages/web（踩过）
const src = fileURLToPath(new URL('../..', import.meta.url))

/** 目录与 DOM 挂点必须对齐：改了组件的 hook 而没改目录，这里会红 */
describe('T-40 壳表面目录', () => {
  it('id 唯一且都是 kebab-case', () => {
    const ids = surfaceIds()
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id).toMatch(/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/)
  })

  it('每个表面在源码里都有对应挂点', () => {
    const files = [
      'shell/layout/sidebar-footer.tsx',
      'shell/layout/sidebar-tabs.tsx',
      'shell/layout/top-bar.tsx',
      'shell/layout/settings-panel.tsx',
      'features/mcp/mcp-settings-client.tsx',
    ]
    const text = files.map((f) => readFileSync(join(src, f), 'utf8')).join('\n')
    for (const s of SHELL_SURFACES) {
      expect(text, `${s.id} 缺 ${s.hook}="${s.id}"`).toContain(`${s.hook}="${s.id}"`)
    }
  })

  it('按 kind 取子集不串味', () => {
    expect(surfacesOf('dialog').map((s) => s.id)).toEqual(['settings-dialog'])
    expect(surfacesOf('zone').length).toBeGreaterThan(0)
  })
})
