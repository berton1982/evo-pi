/**
 * web 切片落点门（C 项）——"新代码必须落在 features/<slice>/ 下"这件事的判据。
 *
 * 为什么不是再写一个"边界检查器"：仓库里已经有 `packages/web/scripts/check-boundaries.mjs`（6 条判据）。
 * 技能不应该复制它（两份规则必然漂移），但也不能只信"你们自己跑过了"——那不是门，是转述。
 * 所以这门只判**切片骨架与落点**这一件事，边界/预算留给仓库自己的脚本，两者互补：
 *
 *   - 切片根存在、`_template/` 参照实现存在（没有参照，新人必然各写一套）
 *   - 每个 `<slice>/` 是 kebab-case，且至少有 hook 或 view 之一样式的文件
 *   - 组件文件（.tsx）只许出现在 `app/`、`shell/`、`features/<slice>/`、`components/ui/`
 *   - `src` 根下不许直接放 .tsx（历史上就是这么开始长成 god 的）
 *
 * 声明在 `arch/rules.json#web`：
 *   { "enabled": true, "root": "packages/web/src", "slices": "features",
 *     "allowedRoots": ["app", "shell", "features", "components/ui"], "template": "_template" }
 * 没有 `web` 段就判红——"没声明"不等于"没有前端"，只是没人写过。
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function walk(dir, out = []) {
  if (!existsSync(dir)) return out
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) {
      if (['node_modules', '.next', 'dist'].includes(e.name)) continue
      walk(p, out)
    } else out.push(p)
  }
  return out
}

export function runWebScaffold({ root = '.', rules }) {
  const cfg = rules?.web
  if (!cfg) {
    return [
      {
        id: 'WEB-CONFIG',
        ok: false,
        detail:
          'arch/rules.json 没有 web 段——没声明不等于没有前端，声明才能判落点（见模板 arch-rules.json）',
      },
    ]
  }
  if (cfg.enabled === false) {
    return [{ id: 'WEB-DISABLED', ok: true, detail: '声明了没有 web 切片（enabled:false）' }]
  }
  const srcRoot = join(root, cfg.root ?? 'packages/web/src')
  const sliceDir = join(srcRoot, cfg.slices ?? 'features')
  const template = join(sliceDir, cfg.template ?? '_template')
  const allowed = cfg.allowedRoots ?? ['app', 'shell', 'features', 'components/ui']
  const results = []

  results.push({
    id: 'WEB-ROOT',
    ok: existsSync(srcRoot) && existsSync(sliceDir),
    detail:
      existsSync(srcRoot) && existsSync(sliceDir)
        ? `${relative(root, srcRoot)} 与 ${relative(root, sliceDir)} 都存在`
        : `缺 ${relative(root, srcRoot)} 或 ${relative(root, sliceDir)}`,
  })
  results.push({
    id: 'WEB-TEMPLATE',
    ok: existsSync(template),
    detail: existsSync(template)
      ? `有参照实现 ${relative(root, template)}`
      : `缺参照实现 ${relative(root, template)}——没有它，每个 slice 都会自己发明目录骨架`,
  })
  if (!existsSync(sliceDir)) return results

  const slices = readdirSync(sliceDir).filter((n) => statSync(join(sliceDir, n)).isDirectory())
  const real = slices.filter((n) => n !== (cfg.template ?? '_template'))
  const badName = real.filter((n) => !KEBAB.test(n))
  results.push({
    id: 'WEB-SLICES',
    ok: real.length > 0 && badName.length === 0,
    detail:
      real.length === 0
        ? 'features/ 下没有任何 slice'
        : badName.length
          ? `${badName.join(', ')} 不是 kebab-case`
          : `${real.length} 个 slice：${real.join(', ')}`,
  })

  const thin = real.filter((n) => {
    const files = walk(join(sliceDir, n)).map((f) => f.split('/').pop() ?? '')
    return !files.some(
      (f) => /^use-.*\.ts$/.test(f) || /-view\.(tsx|ts)$/.test(f) || /-panel\.tsx$/.test(f),
    )
  })
  results.push({
    id: 'WEB-SKELETON',
    ok: thin.length === 0,
    detail: thin.length
      ? `${thin.join(', ')} 里既没有 use-*.ts、也没有 *-view.tsx / *-panel.tsx——切片骨架不成立`
      : '每个 slice 都有 hook 或 view 骨架',
  })

  const tsx = walk(srcRoot).filter((f) => f.endsWith('.tsx'))
  const outside = tsx.filter((f) => {
    const rel = relative(srcRoot, f).split('\\').join('/')
    return !allowed.some((a) => rel === a || rel.startsWith(`${a}/`))
  })
  results.push({
    id: 'WEB-PLACEMENT',
    ok: outside.length === 0,
    detail: outside.length
      ? `${outside.length} 个组件不在允许的落点（${allowed.join(' / ')}）：${outside
          .slice(0, 3)
          .map((f) => relative(root, f))
          .join(', ')}`
      : `${tsx.length} 个组件文件都落在 ${allowed.join(' / ')} 里`,
  })

  const rootTsx = readdirSync(srcRoot).filter((n) => n.endsWith('.tsx'))
  results.push({
    id: 'WEB-FLAT',
    ok: rootTsx.length === 0,
    detail: rootTsx.length
      ? `src 根下有 ${rootTsx.join(', ')}——那是 god 的起点`
      : 'src 根下没有游离组件',
  })

  // WEB-ENTRY：入口页必须是"渲染壳"，不许只做 redirect。
  // 为什么单列：`redirect('/sessions')` 在类型检查、测试、e2e 里都完全正常，
  // 只有人点进首页才看得出"入口变成了二级路由的别名"（web-recal 的 D-1 就是这么来的）。
  const appEntry = join(srcRoot, 'app/page.tsx')
  if (!existsSync(appEntry)) {
    results.push({
      id: 'WEB-ENTRY',
      ok: false,
      detail: `没有 ${relative(root, appEntry)}（入口页）`,
    })
  } else {
    const src = readFileSync(appEntry, 'utf8')
    const isRedirect = /\bredirect\s*\(/.test(src) && !/<[A-Z]/.test(src)
    results.push({
      id: 'WEB-ENTRY',
      ok: !isRedirect,
      detail: isRedirect
        ? '入口页只做 redirect（入口 = 壳本身，不该跳到某个二级路由）'
        : '入口页渲染组件，不是 redirect',
    })
  }

  return results
}

/** 读 `<root>/arch/rules.json`；程序期（P2.5）时 run 自己就是 web 工程所属的 run。 */
export function loadWebRules({ root = '.', runDir }) {
  for (const p of [join(runDir ?? '', 'arch/rules.json'), join(root, '.evo/migration')]) {
    if (p.endsWith('.json') && existsSync(p)) {
      try {
        return JSON.parse(readFileSync(p, 'utf8'))
      } catch {
        return null
      }
    }
  }
  return null
}
