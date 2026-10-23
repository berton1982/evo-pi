# C-G（MCP 设置）复盘 — McpConfig.tsx 2258 行

> 目的：把这一轮真跑里"设计判断错在哪、门太松/太紧在哪"写成可执行的东西，而不是留在对话里。

## 1. 设计判断错在哪

| 判断 | 实际 | 代价 | 为什么当时会错 |
|---|---|---|---|
| 设计写 `packages/core/src/mcp/application/` | 仓库既有约定是 `use-cases/`（`packages/core/src/session/use-cases/`） | 改 manifest + 重新送签 | 照教科书 Clean Architecture 写，没先看仓库目录 |
| 契约里 scope 是 `'user' \| 'project'` | 我在实现里写 `'global'` | 页面列表永远空，白查 2 小时 | 拿"全局"这个词直接映射，没回读 `contracts/schema.ts:12` |
| 以为 `next dev` 可以直接验页面 | dev + StrictMode + HMR 反复挂载 effect，`cancelled` 守卫把结果全丢掉 | 2 小时黑盒排查 | 把"框架行为差异"当成"自己的 bug" |
| 以为 `behaviors.md` 已写 | 一直是 init 铺的 2 行模板 | D1 报 29 个引用不存在的行为 | 门只查文件大小与标题，没查行为条数是否等于 manifest 引用数 |

## 2. 门太松 / 太紧

| 现象 | 类型 | 处置 |
|---|---|---|
| `contractInventory` 在 god 自己 0 处 `fetch` 时报「无可对账项」直接绿 | 太松（分母空） | 新增 `externalIo`（沿 import 追 2 层）+ 试点证明能抓到 3 模块 5 命令 |
| `parity` 只要每行有分类就算通过，写 `todo` 也认 | 太松（能自证） | 分类改闭集：`一致` / `差异（…）` / `blocked（原因+解除条件）`；`blocked` 必须写解除条件 |
| `contractDelta` 要求"有差异就必须有 CHG-" | 太紧 | 「无需变更单 / 不改契约」也算合法结论（C-G 一条契约都没改） |
| D18 落点 id 正则把 `ST-01` 切成 `T-01` | 太紧（判据 bug） | 改 `/[A-Z]{1,3}-[A-Z0-9]*-?\d+/` |
| `landed` 只认元素 id，同文件 `@design C-04` 被判未落地 | 太紧 | 接受"元素 id 或绑定它的组件/hook/store id" |
| `drift` 只把 `elements` 当合法 id | 太紧 | 合法集合扩为 elements ∪ components ∪ hooks ∪ stores |

## 教训与落地

| 教训 | 落地 |
|---|---|
| 判据的"分母"必须来自可复核的采集，不能来自组件自己写没写 IO | `lib/external.mjs` + C2 `externalIo` 门（已进 `rules.md` 第 26 道） |
| 分类词必须是闭集，否则"todo"会伪装成"已对账" | `checks.mjs` 的 `parity` 闭集 + selftest 负例 |
| 框架行为（dev/StrictMode/HMR）与业务 bug 要分开排查，先用生产构建复现 | `references/tooling.md`「先用生产构建复现」一节 |
| 设计阶段写路径前先看仓库现有目录 | `references/design.md` §4.2 第 4 条 |
| 契约里的枚举值必须回读 `schema.ts`，不能凭词义映射 | `references/execution.md` §4.6 |
| e2e 必须能独立运行（每例前复位夹具），否则顺序耦合 | `e2e/mcp/fixture.ts` + 每个 spec 的 `beforeEach` |
