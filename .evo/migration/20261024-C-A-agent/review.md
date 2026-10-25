<!-- TODO-init-scaffold（由 state.mjs init 从 references/templates/review.md 铺底）
     1. 逐节把占位符换成真实内容（不要留 <...>）
     2. 填完后删掉这段注释——留着的 TODO 就是没做完
-->

# 代码评审清单 — `review.md`

> 由 `state.mjs init` 铺底（顶部横幅不删即判红）；跑 `check-phase --phase C5` 校验。
> 为什么是固定 12 项：过去 `review.md` 是自由发挥的散文（"依赖方向 ✅"），
> 门只能判"文件在不在"，人看不出该 review 什么。
> 现在是**清单 + 度量对账**——门会自己量你落点文件的行数/状态数/副作用数/嵌套/any，
> 量出来的问题必须在对应项写 `fix` 并给出 `文件:行`，否则红。

## 检查清单

| 检查项 | 结论 | 证据 |
|---|---|---|
| 单一职责 | pass | 例：`features/<slice>/<panel>.tsx` 只拼 presenter，状态都在 `use-mcp-settings-panel.ts` |
| 文件体量 | pass | 例：最大 `use-<slice>.ts`（阈值 400） |
| 函数体量 | pass | 例：最长一个用例工厂 58 行（阈值 60） |
| 嵌套深度 | pass | 例：`<slice>-panel-view.tsx` 最深 3 层（阈值 4） |
| 参数与 props | pass | 例：panel 9 个 props 已拆成两个对象参数 |
| 依赖方向 | pass | 例：能力只 import 包导出 `@evo-pi/core/<slice>`，不碰 `shell/` 实现 |
| 错误处理 | pass | 例：适配器统一把非 2xx 转 `ApiError`，用例只认结果对象 |
| 命名与注释 | pass | 例：注释写"为什么这样写"而不是"做了什么" |
| 测试覆盖 | fix | 例：补了批量部分失败时逐条回填的用例 |
| 可访问性与交互态 | pass | 例：列表项用 `aria-pressed` 而不是自绘高亮 |
| 副作用与竞态 | fix | 例：加载 hook 用 `createLatestOnly` 丢弃过期响应 |
| 死代码与重复 | fix | 例：删掉逐条循环，改为批量端点 |

## 结论

> 例：以上 3 项 fix 已在同一切片内关闭；未关闭项为 0。
> 把"还剩什么"写清楚——空着无法区分"没有遗留"与"忘了写"。

## 双轴（可选补充）

- **Standards**：与 `packages/web/ARCHITECTURE.md` 的偏差、与 `arch/rules.json` 的偏差。
- **Spec**：与 `spec.md` 的用户故事/源码覆盖的偏差（哪条行为没覆盖，写到 `parity.md`）。
