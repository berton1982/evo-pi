# 切片模板（照抄这个目录）

新能力从这里开始，不要从 `shell/` 或 `components/` 开始——那是壳与地基，不是能力。

```
features/<slice>/
  use-<slice>.ts         # 视图状态与派生（纯前端状态，不含 IO）
  <slice>-panel.tsx      # 容器：注入端口、编排动作，props ≤ 6
  <slice>-view.tsx       # 展示：只吃 props，不发请求（能截图测试的那一层）
  stores/                # 跨组件共享的客户端状态（一个状态一个持有者）
  adapters 不放这里      # HTTP/fs 适配器住 `@evo-pi/core/<slice>/adapters`
  panel-spec.tsx         # 被 shell 装配时对外只暴露这个（shell 不许 import 实现）
```

四条硬规矩（`scripts/check-boundaries.mjs` + 立项门 `webScaffold` 判）：

1. `.tsx` 只能住在 `app/`、`shell/`、`features/<slice>/`、`components/ui/`，`src` 根下不许有组件。
2. `shell/**` 不许 import `@/features/**`；`features/a` 不许 import `features/b`。
3. 预算：`shell` ≤200 行、`app` ≤60 行、`features` 单文件 ≤200 行。
4. 单文件 `useState` ≤4、`useEffect` ≤3、props 字段 ≤8。

为什么要有这个目录：C-G 试点里 `packages/web/src/components/*` 是平铺的，AppShell 就是这么长到 2796 行的。
参照实现（而不是一段规则文字）才能让人抄对。
