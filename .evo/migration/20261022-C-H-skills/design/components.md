# 静态视图 — C-H「设置 · 技能」（`SkillsConfig.tsx` 1089 行）

> 给实施的人看：**谁由谁组成、谁是容器谁是展示、状态归谁、谁订阅谁**。
> 给测试的人看：每个组件的「不负责」列就是它不该被测试覆盖的东西；props 表就是测试要构造的输入。
> 机器判据：D11（组件树闭合）· D12（hook/store 归属）· D13（图里 id 已声明）· **D17**（型标注 + 依赖 `-->` + 订阅 `..>`）· **D18**（最佳实践落地）。
> 图内 id 用 `C01` 这种短名（mermaid 的 `classDiagram` 不认连字符），真实 id 写在标签里。

## 1. 组件图

```mermaid
classDiagram
  direction LR

  class C01["C-01 SkillsPanel «container»"] {
    <<container>>
    +cwd: string
    +trust: TrustState
    +holds: ST-01 ST-02 ST-03
  }
  class C02["C-02 SkillDetail «presenter»"] {
    <<presenter>>
    +skill: Skill
    +onToggle(id, next)
    +onCheckUpdate(id)
    +onUpdate(id)
  }
  class C03["C-03 AddSkillPanel «presenter»"] {
    <<presenter>>
    +cwd: string
    +onClose()
    +onInstalled(skill)
  }
  class H01["H-01 useSkillsView «hook»"] {
    <<hook>>
    +useSkillsView({cwd, trust}): SkillsView
  }
  class H02["H-02 useSkillDetail «hook»"] {
    <<hook>>
    +useSkillDetail({skill, cwd}): SkillDetailView
  }
  class H03["H-03 useSkillAdd «hook»"] {
    <<hook>>
    +useSkillAdd({cwd, onInstalled}): SkillAddView
  }
  class ST01["ST-01 skillsView «store»"] {
    <<store>>
    +skills loading error selected
  }
  class ST02["ST-02 skillToggle «store»"] {
    <<store>>
    +toggling saveError bulkGroup groupStatus
  }
  class ST03["ST-03 skillUpdates «store»"] {
    <<store>>
    +updateStatuses checkingUpdates checkingAll updatingSkill updateError
  }
  class ST04["ST-04 skillDetail «store»"] {
    <<store>>
    +instructions instructionsError documents anchorRequest
  }
  class ST05["ST-05 skillAdd «store»"] {
    <<store>>
    +query results searching searchError installing installError newlyInstalledPkgs scope
  }
  class P01["P-S-01 SkillRepository «port»"]
  class P02["P-S-02 SkillContentReader «port»"]
  class P03["P-S-03 SkillMarket «port»"]
  class U01["D-B-01 ListSkills «use-case»"]
  class U02["D-B-05 ToggleSkillGroup «use-case»"]

  C-01 --> C-02 : 选中项
  C-01 --> C-03 : addMode
  C-01 --> H-01 : 取数/编排
  C-02 --> H-02 : 详情与文档
  C-03 --> H-03 : 搜索/安装
  H-01 ..> ST-01 : 订阅 skills/selected
  H-01 ..> ST-02 : 订阅 toggling
  H-01 ..> ST-03 : 订阅 updateStatuses
  H-02 ..> ST-02 : 订阅 saveError
  H-02 ..> ST-04 : 订阅 instructions/documents
  H-03 ..> ST-05 : 订阅 results/installError
  H-01 --> U01 : list(cwd)
  H-01 --> U02 : toggleGroup(ids, next)
  H-02 --> P02 : readContent(filePath)
  H-03 --> P03 : search(query)
  U01 ..> P01 : 调用端口
```

读法：**实线箭头是"谁渲染谁 / 谁调用谁"，虚线箭头是"谁订阅谁"**。容器只有一个（`C-01`），它下面两个 presenter 都不持有页面级状态；`H-*` 是组件内部的业务逻辑，不对外暴露 store。

## 2. 元素清单

| id | 型 | 落点 | 负责 | **不负责**（测试不必覆盖） |
|---|---|---|---|---|
| `C-01` | container | `.../skills/ui/SkillsPanel.tsx` | 取数、编排、决定渲染哪个面板、持有页面级 6 个 state | 详情渲染、市场搜索、任何 `fetch` 直调 |
| `C-02` | presenter | `.../skills/ui/SkillDetail.tsx` | 渲染详情/文档/锚点高亮、把用户操作转成回调 | 决定开关是否乐观更新（由 `H-01` 定） |
| `C-03` | presenter | `.../skills/ui/AddSkillPanel.tsx` | 搜索框、结果列表、安装按钮与进度 | 安装完成后列表怎么排序（交给 `onInstalled`） |
| `H-01` | hook | `.../skills/use-skills-view.ts` | 首载、`trustKey` 变化重载、选中持久化、单/批量开关（乐观+回滚）、检查更新 | 渲染、样式 |
| `H-02` | hook | `.../skills/use-skill-detail.ts` | 读 `SKILL.md` 原文、文档列表、锚点解析与滚动请求 | 与列表通信 |
| `H-03` | hook | `.../skills/use-skill-add.ts` | 市场搜索、安装、安装后局部刷新 | 关闭面板（由 `onClose`） |
| `P-S-01/02/03` | port | `packages/core/src/skills/ports/*.ts` | 定义技能仓/原文读取/市场三个能力边界 | 任何 UI 关注点 |

## 3. hook：组件内部的业务逻辑

| id | 签名 | 替换源码 | 被谁用 | 调哪些端口 |
|---|---|---|---|---|
| `H-01` | `useSkillsView({ cwd, trust }): SkillsView` | `SkillsConfig.tsx` L626-L1089 | `C-01` | `P-S-01` |
| `H-02` | `useSkillDetail({ skill, cwd }): SkillDetailView` | L130-L355 | `C-02` | `P-S-02` |
| `H-03` | `useSkillAdd({ cwd, onInstalled }): SkillAddView` | L356-L625 | `C-03` | `P-S-03`, `P-S-01` |

hook 不返回 store 实例，只返回"这个组件能用的视图 + 回调"——这样 `C-02` 换掉 `H-02` 的实现时不需要改调用方。

## 3.5 前端最佳实践（落地）

| 实践 | 落在哪 | 做到什么程度 |
|---|---|---|
| 容器展示分离 | `C-01` / `C-02` | `C-01` 只取数与编排、`C-02` 只渲染；`C-02` 里不 import 任何 `fetch` 封装，请求全经 `H-02` |
| 状态就近 | `C-02` | 详情面板的展开/滚动位置留在 `C-02` 内部的 `useRef`，不上提到 `C-01`，避免列表整片重渲染 |
| 派生状态不落库 | `H-01` | 分组名、启用数量、`visibleSkills` 用 `useMemo` 从 `skills` 派生，**不写进 `ST-01`**（否则失效时机不可控） |
| 渲染优化 | `C-02` | 行组件用 `memo` 包裹，`onToggle`/`onUpdate` 用 `useCallback` 固定引用（依赖只有 `cwd`），避免每次父渲染都重建回调 |
| 列表 key 稳定 | `C-01` | 技能列表 `key` 用 `skill.filePath`，**不用数组下标**——开关后会重排，下标做 key 会把 DOM 状态串行 |
| 受控与非受控一致 | `C-03` | 搜索框是受控组件（`value` + `onChange` → `ST-05.query`），不出现内部 `useState` 与外部状态各存一份 |
| 可访问性 | `C-03` | 搜索框 `role="searchbox"` + `aria-label`；结果项 `role="option"` 且可 Tab 聚焦、Enter 安装；安装中 `aria-busy` |
| 错误边界 | `C-01` | 用 `ErrorBoundary` 包住 `C-02`/`C-03`：详情崩了不该整页白屏，边界内提供"重试/返回列表" |
| 三态齐备 | `C-01` | loading 用骨架屏、空态用 `role="status"` 文案、错误态带**重试按钮**并把错误码写出来（`SKILL_READ_FAILED` 等） |
| 代码分割 | `C-03` | 市场面板用 `lazy(() => import("./AddSkillPanel"))` + `Suspense`，首屏只加载列表与详情 |
| 并发竞态 | `H-01` | 每次 `cwd`/`trustKey` 变化递增 `generation`，响应回来与当前 `generation` 不等就丢弃（源码 `:692` 的整体重载等价物） |
| 缓存与失效 | `H-01` | 列表按 `cwd` 记忆化 `Map`，切换项目命中缓存；开关成功后只 `invalidate` 该 `filePath`，其余保持 stale 直到下次读取 |

## 4. store：内部状态与被订阅关系

| id | state | 持有者 | 订阅者 | 生命周期 |
|---|---|---|---|---|
| `ST-01` | `skills` `loading` `error` `selected` `addMode` `projectResourcesLoaded` | `H-01` | `C-01`、`C-02`（只读 selected） | `cwd`/`trustKey` 变化整体重置 |
| `ST-02` | `toggling` `saveError` `bulkGroup` `groupStatus` | `H-01` | `C-01`、`C-02` | 单次操作生命周期；失败后保留到用户看到错误 |
| `ST-03` | `updateStatuses` `checkingUpdates` `checkingAll` `updatingSkill` `updateError` | `H-01` | `C-01` | 按技能累积，切 `cwd` 清空 |
| `ST-04` | `instructions` `instructionsError` `documents` `anchorRequest` | `H-02` | `C-02` | 面板关闭即丢弃 |
| `ST-05` | `query` `results` `searching` `searchError` `installing` `installError` `newlyInstalledPkgs` `scope` | `H-03` | `C-03` | 关闭面板即丢弃 |

**为什么不用一个全局 store**：`ST-04`/`ST-05` 是面板级状态，塞进 `ST-01` 会让"关掉详情"变成一次全列表重渲染；而 `ST-01` 必须跨面板存活（选中项要持久化）。

## 5. 关键取舍

| 症状 | 选了什么 | 被否方案 | 错判成本 |
|---|---|---|---|
| `B-006`（开关点下去立刻要动） | 乐观更新 + 失败按 id 精确回滚（`PA-01`） | 等请求返回再改 UI：开关点下去 200ms 没反应，用户会连点 | 回滚写错会把别人的改动一起撤掉——所以只按 id 恢复 |
| `SkillsConfig.tsx:840`（批量 24 个） | 批量复用单条端点，返回 `results[]`（`PA-02`） | 逐条串行 PATCH：24 次往返，失败一半难描述 | 批量语义变了要回来改；已在 `PR-04` 固化为 `results[]` |
| `SkillsConfig.tsx:176`（文档内跳转） | 锚点局部滚动（`PA-03`） | 整页 `location.hash` 跳转：详情是面板，跳转会连列表一起滚 | 锚点解析错会跳错标题——由 `D-U-04` 的 `resolveSkillLink` 单测覆盖 |

## 6. 变化出处

改造中新出现的组件/hook/store 怎么指回源码：`ref_projects/pi-web/components/SkillsConfig.tsx:626-1089`（直接行段）；端口 `P-S-01/02/03` 无对应源码行——`rationale` + `derivedFrom: D-U-07`（D14 核对）。合并说明写在 `ownership.md` 的区间备注里。
