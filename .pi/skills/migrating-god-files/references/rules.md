# 防遗漏链路：为什么"迁完了"可以被机器证伪

> 用户的问题：实施后，pi-web 里 god 文件的逻辑是否都会迁到 evo-pi？有没有机器检查？
>
> 答案：**有 43 道串联的门**，每一道都堵住一种特定的"漏"。但没有任何单一门能证明"全迁了"——
> 所以这里把链路写清楚，并明确**残余风险**，避免把"门全绿"当成"绝对没漏"。

## 1. 43 道门（串联，任一门红即停）

> 本文是**人话概念门**；它们与 `phases.mjs` 的 50 个阶段 kind、`checks.mjs` 的实现如何对应、有没有幻影门，由 `references/gates.md` + `check-gates-map.mjs` 对账。

| # | 门 | 在哪 | 堵住哪种漏 | 机器判据 |
|---|---|---|---|---|
| **1** | 清单封闭 | P0 `godRegistryClosed` | **god 文件本身没被登记**（漏掉整个文件） | 扫 `ref_projects/pi-web` 下 >1000 行生产文件，逐个对 GODS.md |
| **2** | 风险分级 | P0 `godsHaveR` | 低风险模块被高流程成本拖住 / 高风险模块被轻流程放过 | 每个 god 行必须有 R1/R2/R3 |
| **3** | 能力归属不重不漏 | P3 `capabilityPlan` | god 没归入任何能力，或归了两个能力 | 集合恰好一次覆盖 |
| **4** | 指纹一致 | C0 `godFingerprint` | 迁移中途源码变了，旧结论失效 | 行数 + sha1 与磁盘一致 |
| **5** | **符号级对账** | C1 `symbols` | **符号被漏读**（读了几段就当读完） | 符号全集 ↔ `symbol-map.md`：遗漏 0 / 过期 0 / 虚报 0 / drop 必给理由 |
| **6** | 行区间无缝 | C1 `coverage` + `ownershipTypes` | 某些行没人认领；或把行标成 `drop` 静默丢弃 | 每个 god 单独判覆盖；类型只能是 feature/skeleton/infra/drop，drop 必须有依据 |
| **7** | 表面点认领 | C4 `D2` | **交互点漏实现**（按钮做了，键盘没做） | `surface.json` 每个表面点 ∈ 设计元素 ∪ excluded |
| **8** | 行为↔脚本绑定 | C3 `behaviors` | 行为清单自证；脚本写了但没覆盖任何行为 | 每条行为有 `script_id`；registry 里零孤儿脚本 |
| **9** | 行为对账闭合 | C6 `parity` | 实现了但行为与 pi-web 不一致 | 每条行为有对账结果；未分类差异 = 0 |
| **10** | **任务层不由人嘴说** | C5 `trace` | 设计元素没有任务实现（范围静默缩水）；任务引用不存在的元素（范围膨胀） | 行为↔设计↔任务↔测试四向闭合 |
| **11** | **门证据不是人手写** | C5/C6/X1 `verification` | `gates/*.md` 写 ✅ 但命令没跑 | 只认 `gates/*.json`（真跑、exit 0、≤30 天） |
| **12** | **每一行都有着落** | C1/C4/C5 `lines` | 符号对账只覆盖声明，JSX/effect 体的行没人管；drop 一句话就删掉整段 | 行区间 1..N 闭合 + owner∈manifest + landing 存在且带 `@design` + drop 在砍掉清单 |
| **13** | **契约对齐可核对** | C2 `contractAlign` | 对齐表只写"已对齐"三个字；差异发现了却没编号，等于没人管 | 对齐表 ≥2 行；每行要么指向契约文件，要么挂 `D-xx`/`CHG-xx`；文件出现 ❌/⚠️/差异 必须有 `CHG-` |
| **14** | **组件树闭合** | C4 `D11` | 设计说"拆成组件"，但组件树有两个根、parent 指向不存在的组件、或组件没有落点文件 | 唯一根 + parent 存在且无环 + `element` 已声明 + `file` 在 evo-pi 里 + `props` 是数组 + `sources` 非空 |
| **15** | **hook/store 不是许愿** | C4 `D12` | 写了"抽出 useXxx hook"却没有签名、没有替代的旧代码、没人用；store 持有别人的状态 | hook 的 `usedBy` 非空且都是已声明组件、`replaces` 必填；store 的 `stateRefs` ⊆ `states` 且 owner 必须等于该 store 的 element |
| **16** | **图上的节点真实存在** | C4 `D13` | 流程图/时序图看着很专业，节点是拍脑袋的 id；组件做完没人知道它在哪张图 | `design/components.md` 与 `design/dynamics.md` 的 mermaid 节点 id 必须已声明；非时序图 ≥2 节点；每个组件至少出现在一张图；铺底模板未填即红 |
| **17** | **设计对源码是全覆盖的** | C4 `D14` | 设计元素凭空出现（没有源码出处），或改了行段让设计看起来自洽，而 ownership 说另一回事 | 元素 `sources` 必须落在本 god 且不超行数；合并后必须与 ownership 归属逐段相等；派生元素要 `rationale` + `derivedFrom` |
| **18** | **视图能当图纸用（UML 型 + 订阅边 + 动态图）** | C4 `D17` | 组件树写成一棵 ASCII 树：看不出谁是容器谁是展示、hook 与 store 混在一起、store 被谁订阅完全没画；接口只写成一堆 `interface`，没人知道它被谁在什么时序里调用 | `components.md` 的 mermaid 必须是 `classDiagram`/`flowchart`/`graph`；每个组件标 `«container»`/`«presenter»`、hook 标 `«hook»`、store 标 `«store»`（图内短名 + 标签写真 id 也认）；必须有 `-->` 依赖边与 `..>` 订阅边；`dynamics.md` 至少一张 `sequenceDiagram` 且**每个端口都出现**，每个 store 至少一张 `stateDiagram` |
| **18b** | **前端最佳实践真的落地** | C4 `D18` | 文档里写"注意性能/遵循最佳实践"；实践落点指不到元素；渲染优化没写用什么机制 | `components.md` 的「前端最佳实践」表 ≥6 类（闭集 12 类）；每条落点必须含已声明 id；「做到什么程度」≥10 字，且渲染优化/并发竞态/缓存失效/可访问性/三态/代码分割必须带机制词 |
| **19** | **散文不写假出处** | C4 `D16` | 设计文档里写 `path:line` 撑论证，文件不存在或行号越界（试点里我自己就写过"唯一需要 aria-checked"，实测 `aria-` 出现 0 次） | 扫 run 根与 `design/**.md`，每个 `path:line` 锚点必须文件存在且行号 ≤ 文件行数 |
| **20** | **成果清单不落空** | 每阶段 `produces` | `produces:` 是愿望清单，门只管自己关心的几个文件 | `produces` 里的静态路径（支持 `{a,b}` 展开）必须落盘 ≥60B |
| **21** | **前端约定和后端一样可判定** | P2.5 `frontendArch` | 后端有层序/禁止边，前端只有口头默契（"用 shadcn、状态放 zustand"），到 C4 才补 | `arch/frontend.md` 八节齐备（分层与目录 / 状态的分类与归属 / 数据获取与缓存 / 三态与错误 / 组件与 props / 样式与 token / 可访问性与键盘 / 测试与预算）且 ≥600 字；`arch/rules.json#frontend` 含 `layers`(≥3)/`stateClasses`(≥3，每项 rule+forbidden)/`forbidden`(≥1)/`budgets`(正数) |
| **22** | **桩先于开发** | P1 `stubPlan` | "前后分离"只剩一句口号：契约冻结了，桩没摆，前端只能等后端 | 契约每条命令/事件在 `contracts/stubs.md` 有一行；状态只能 `ready`/`blocked`（blocked 需 ≥10 字理由）；ready 的桩实现与夹具必须真实存在；铺底模板未填即红 |
| **23** | **本能力的桩真就绪** | C5 `stub` | 桩清单整体齐了，但本能力要用的那条还没人做，开发到一半卡住 | 按 `surface.json` 的 `api` 点（`METHOD /path`）逐条核对桩与夹具 |
| **24** | **联调 = 桩被真实现替换** | C5 `integration` | 桩全绿、单测全绿，但真实现从没跑过一次（"上线才发现不通"） | `integration.md` 每条 api 命令有真实现路径（存在、且不能写"桩"）+ 联调证据（`T-xx`/`gates/*.json`/`e2e/...`） |
| **25** | **验收六层，最后一层不可代签** | C6/C7 `acceptance` | 只跑测试不看用户；或 L6 由 agent 签"用户满意" | L1 算法规格 / L2 架构契约 / L3 组件交互 / L4 行为对账 / L5 联调（有 api 时必需）/ L6 人工验收；pre 阶段 L6 可 pending，final 必须 pass 且签字人为人 |
| **26** | **规格先说人话，再动手** | C3 `capSpec` + `humanSignoff` | 需求只存在于聊天记录里；迁移范围靠"我记得"；把弹窗改成路由没人发现 | 用户故事 ≥3 条（触发/期望各 ≥8 字）+ 源码覆盖表（每 god 文件多区间、合计 ≥85% 行）+ `## 交互与导航`（dialog/panel/route + `path:line` 证据，与 pi-web 不同必须写明理由）+ `## 与 pi-web 的布局映射` ≥3 行；**必须人签** |
| **27** | **实施前先看得见原型** | C4 `uiProto` + `humanSignoff` | 代码写完才发现层级、分组、空态全不对（MCP 试点的真实教训） | `design/ui.md` 至少两块 ASCII（主屏 + 空态/失败态），每块 ≥6 行、有框线、≥2 个区域词（列表/详情/工具栏/状态/空态/表单）；`## 交互态` ≥3 行；**必须人签** |
| **28** | **hook / store 各有一句话职责** | C4 `design:D19` | 组件里塞业务分支；store 变成"什么都往里放"的仓库 | `design/components.md` 的 hook 表与 store 表都要有「职责」列（每行 ≥10 字），且 manifest 里每个 hook/store 都在表里 |
| **29** | **分母不由被检方自证** | C1/C6 `denominator` + 全部 `surface`/`symbols` | 175 条手填符号冒充 450 条 LSP 结果；parity 里 N/N 达标其实只核了 N 行字 | 台账必须写 `> 分母：N 条…（来源 <file> sha <8位>）`；分母条数从来源复算；脚本产出的分母要在 `evidence/provenance.json` 记账（手填 `source:'hand'` 一律红） |
| **30** | **一处砍单要改十处视图** | C5 `changePropagation` | "Code mode 不迁"一句话，实际要动 spec/manifest/图/归属/砍单/行为/脚本/计划/代码十处，靠三道门轮流报红才补全 | `changes/CHG-*.md` 列「视图 / 状态 / 说明」十行；状态只能 `done`/`skip`，`skip` 要理由，`done` 引用的文件必须存在 |
| **31** | **环境要按文档跑得起来** | P1 `envReady` | TS 7 没有 `tsserver.js`、`next dev` 让 effect 反复挂载、`PI_CODING_AGENT_DIR` 写进真实目录——三件事各吃掉一段时间，没有一件是代码问题 | `environment.md` 五节（端口/变量/构建/版本/夹具）+ 关键条目（`PI_CODING_AGENT_DIR`、`30041`、`30141`、`tsserver`、`next start`）+ 「项/值/说明」表 ≥5 行 |
| **32** | **每道门自己说清"抓不到什么"** | `check-gates-map` + `references/gates.md` 三层视图 | 54 道门全绿，用户看一眼界面说"差距很大"——门没撒谎，只是从没声称能判"信息量/交互形态" | `scripts/lib/gatemeta.mjs` 里每个 kind 有 `layer`（存在性/结构/语义）+ `canCatch` + `cannotCatch`；语义层阶段必须配 `humanSignoff`；反向用例覆盖率低于 20% 判红 |
| **33** | **规则只能来自仓库事实** | `conventions` 门（P2.5）+ `arch/conventions.json` | C-G 试点把 6 个 HTTP 适配器写进 `packages/web/`，而 `packages/core/src/session/adapters/` 早就在那儿；AD 还是照着教科书写的 `application/` | `extract-conventions.mjs` 扫 `packages/<pkg>/src` 产出分层事实；`rules.json#layerPaths` 每个值必须能在事实里找到；AD 必须提到 ≥3 个真实存在的层；事实 >30 天未重扫判红 |
| **34** | **落点必须落在层里** | `placement` 门（C4 `plan` / C5 `landed`） | 元素 `file` 写成 `packages/web/src/mcp/adapters/x.ts`，`next build` 才炸（`node:fs` 进了浏览器 chunk） | 每个元素落点必须命中 `layerPaths`；adapters 不在 web 时 web 下出现 `adapters/` 判红；`landed` 模式要求文件存在，且客户端组件 import `node:*` 或 `@evo-pi/core/src/**` 判红 |
| **35** | **评审要有可核对清单** | `review` 门重写 + `templates/review.md` | C-G 的 `review.md` 39 行全是自述（"依赖方向 ✅"），门只判"文件在 + 两个标题 + 无 ❌" | 12 项固定清单，每项 `pass`/`fix`/`na`；`fix` 必须带 `文件:行`，`na` 必须写理由；`reviewkit` 会量落点文件的行数/状态/副作用/嵌套/`any`，量出的超限项必须在对应清单项写 `fix` 并点名文件，否则红 |
| **36** | **web 新代码只能落在切片里** | C5 `webScaffold` | `packages/web` 起初是 `components/` 平铺，god 文件就这么长出来；A/B 两门只管"分层事实"和"元素落点"，没有一条判"组件该放哪个目录" | `arch/rules.json#web` 声明 `root`/`slices`/`allowedRoots`/`template`；`features/_template` 必须在；每个 slice 至少一个 `use-*.ts` 或 `*-view.tsx`/`*-panel.tsx`；`.tsx` 只能住在允许根下；`src` 根下不许有游离组件 |
| **37** | **没提过的「少一点」不算差异** | C6 `fidelity` | 数据面 27 条行为全绿、字段差也登记了，用户并排一看还是「差得远」——因为「页面少了可及元素」从来没人登记 | `harness/snapshot/fidelity/*.{piweb,evopi}.json` 两侧都拍；覆盖率 ≥70%；**pi-web 独有的每个可及元素必须在 `parity.md` 出现名字**（没对齐可以，没提过不行） |
| **37** | **没提过的"少一点"不算差异** | C6 `fidelity` | 用户说"与 pi-web 差距很大"，而门全绿：从没量过差多少 | 两侧快照同口径采集；pi-web 独有的每个可及元素必须在 `parity.md` 被提过；覆盖率只作参考线 |
| **38** | **界面任务实施前先观察** | C5 `observations` | 不看现有界面就写组件，凭空发明布局与文案 | `observations/<T-xx>.md` 三段（看到什么/差在哪/决定），"看到什么"必须给 `path:line` |
| **39** | **渲染边界要写清** | C0 `renderBoundary` | C-C 试点把主区顶栏画成"新建·会话名"，而顶栏属 C-B、输入区属 C-D，本能力从未读过 | `CHARTER.md` 的「## 渲染边界」表：区域 / 宿主（self / shell / other:<能力>）/ 说明 |
| **40** | **引用谁就得读过谁** | C3 `readlogCoverage` | 原型里画了别人的界面，`readlog.md` 里那个文件出现 0 次 | `spec.md`、`design/ui.md` 点名的每个源文件都必须在 `readlog.md` 有阅读记录 |
| **41** | **入口清单双向对账** | C4 `uiProto:inventory` | `uiProto` 只查"有 ASCII"，少画 6 个顶栏按钮照样绿 | `components.md` 有「区域 / 入口 / 源」表；表与原型双向一致（少画、多画都红） |
| **43** | 运行时匹配 | C4 `placement(plan)` / C5 `placement(landed)` | **业务规则被搬进前端、呈现逻辑被塞进后端**（C-C 的 chat 就是这么错的） | 元素必须声明 `runtime`；`server` 不许落 `web/**`、`client` 不许落 `core/**`、web 里不许有 `use-cases/` 或 `domain/ports/`、web 不许直接 import `node:` |

另有五个横向门：

| 门 | 作用 |
|---|---|
| C1 `lspSource` | 分母必须来自 tsserver 采集，且 `symbols-*.meta.json` 的 `count`/`mode` 与 state 一致；`program` 降级 = 结论作废（试点实测 175 vs 450） |
| C2 `contractInventory` | 源码里的 HTTP 端点（`method + path`）/命令/事件必须都在冻结契约里（跨端逻辑不丢） |
| C2 `contractDelta` | 有差异就必须有变更单（逐行「变更单」列，或整篇一张 `CHG-`） |
| 全阶段 `produces` | 阶段声明的产物真落盘，不是只在文档里列过 |
| P1–C5 `stub*` / `integration` | 桩与联调不是一次性文档：P1 管"清单齐"，C5 管"本能力齐"，联调管"换成真实现" |
| X1 `programAudit` | 收尾：所有 god 标「已完成」，所有能力无「待开始/进行中」 |

## 2. 四维分母（关键：四个分母互不包含，别混用）

| 维 | 分母 | 粒度 | 回答的问题 | 门 |
|---|---|---|---|---|
| **符号** | tsserver 声明全集（`evidence/symbols-*.md` + 同名 `.meta.json`） | 声明 | 我**读全**了吗 | C1 `symbols` + `lspSource`（读 meta） |
| **行** | `ownership.md` 的行区间（1..N 无缝） | 行 | 每一**行**有人管吗（读不懂也只是 `review`/`drop`+理由） | C1 `lines structure` / C4 `lines bind` / C5 `lines landed` |
| **表面** | 可交互表面点（`surface.json`，按 `kind` 分账） | 交互点 | 每个**可交互点**有主人吗 | C4 D2 |
| **行为** | `behaviors.md` 行 | 语义 | 每条行为**被验证**了吗 | C3 `behaviors` + C6 `parity` |

四维是**并集关系，不是包含关系**：声明不含 JSX 子树与 effect 体 → 才有行维；行维不含"这个 onClick 属于哪个设计元素" → 才有表面维；表面维不知道"点了之后应该发生什么" → 才有行为维。四个分母的交集为空、并集才等于"没有静默丢失"。

- 符号覆盖查"漏读"，行覆盖查"整段逻辑没交接"（如一段渲染分支），表面覆盖查"漏做入口"，行为覆盖查"做错"。
- 只报符号会漏掉"读了但没实现"；只报行为会漏掉"没想到的行为"（行为分母是人写的）；只报表面会漏掉"入口在但内部空转"。
- **汇总口径**：任何一个维度的分子 < 分母时，不许说"迁移完成"，只能说"该维度 X/Y"。

## 2.1 四个分母各自的"分母来源"必须落盘

自证式分母是本技能被试点打过的最重一棍：`symbolSource: 'LSP'` 是手填字符串时，175 条能冒充 390 条。规矩：

| 维 | 分母怎么来 | 落盘证据 | 门怎么核 |
|---|---|---|---|
| 符号 | `enumerate-symbols --mode ts`（自己起 tsserver） | `symbols-*.md` + `.meta.json`（`mode/count/tsserverPath/tsVersion/project`） | `lspSource` 读 meta 且 `count === gods[].symbols` |
| 行 | `ownership.md` 手写区间 | 区间表本身 + `cut-list.md` | `lines` 三档 + D14 与元素 `sources` 逐段比对 |
| 表面 | `enumerate-surface` 正则抽取 | `surface.json`（含 `kind`/`file`/`line`） | D2 认领 + `claim-surfaces --report` 分账 |
| 行为 | 人写 `behaviors.md`（带 `path:line`） | 行为表 + `harness/registry.json` | `behaviors`（每条有证据）+ `parity`（双向绑定 + `status` 分级） |

## 3. 残余风险（诚实清单）

| 风险 | 现状 | 缓解 |
|---|---|---|
| **条件分支漏覆盖**：一个 handler 有 5 条分支，一条行为行就"覆盖"了 | 部分：R3 要求 `specs/` 决策表逐条列规则；`check-specs` 校验每条有 `path:line` 与测试 ID | R3 强制；R1/R2 靠 review。**这是当前最大的残余风险** |
| **表面枚举的召回率**：动态拼接的 handler、运行时分发的事件可能枚举不到 | `enumerate-surface` 覆盖 8 类规则（handler/aria/role/command/event/url/i18n/hotkey） | 与 OpenWiki `tech-debt` 页交叉核对；R3 人工补 `excluded` 并给理由 |
| **"没想到的行为"**：分母来自人的枚举 | 表面点提供外部分母，但语义层（比如"应该有撤销"）无法机器枚举 | 用 pi-web `product/` 的 US 交叉核对（E2，需过 drift 检查） |
| **非 UI 副作用**：localStorage、cookie、剪贴板、下载、权限请求 | 不在表面规则里 | C6 三维 diff 的 wire 通道能抓到一部分；其余需在 `behaviors.md` 显式写 |
| **capture 不忠实**：动态内容/时序/随机 | harness 需归一化（mask uuid/timestamp/port） | P1 `harness` 门强制"有归一化规则"；无法自动采集的标 `kind: manual` 并签名 |
| **样式/视觉回归** | 只锚结构锚点，不锚像素 | H3 + C6 的 DOM/a11y/截图三维 diff；像素级不放门（会变成噪音门） |

**结论**：这些门把"漏"从"靠自觉"变成"可被证伪"，但**不能替代判断**。
门全绿的意思是"没有已知未解释的遗漏"，不是"绝对没漏"。

## 4. 铁律与证据纪律

### 4.1 五条铁律

1. **先读全景表再动手**——`GODS.md` 是唯一权威；P0/P3/C0 三道门强制。
2. **状态只由脚本写**——手改 `state.json` = 给下一个 session 埋假信息。
3. **门不过不推进**——要么修产物，要么改门并记录原门为何不合理。
4. **技能不引用运行期产物**——只用 `.evo/migration/<run>/` 占位；教训写成规则。
5. **签字不代签**——架构、底盘契约、切片、设计、验收由用户签。

### 4.2 AD 六条不可协商（D10 核对）

1. 层序单向：`domain ← use-cases ← ports ← adapters ← infrastructure ← ui`
2. 状态唯一真源：server cache / store / URL 三者不许互相复制
3. 通信机制封闭枚举（`arch/rules.json.mechanisms`），矩阵不留空
4. 通知是副作用不是状态：单一 sink、幂等、可去重
5. 流式唯一入口 + 唯一 reducer
6. 错误是封闭枚举，能力内不许私造

### 4.3 证据分级

| 级别 | 来源 | 可用于 |
|---|---|---|
| **E1** | LSP（`code_resolve` / `code_graph` / `code_inspect` / `code_find`） | 结构、符号全集、引用 |
| **E2** | OpenWiki `tech-debt/`、`product/`（**必须过 `check-openwiki-drift`**） | 业务分析、能力划分 |
| **E3** | 旧研究文档、对话摘要 | 只当线索 |
| **E4** | 记忆 | 不可作为证据 |

### 4.4 启发式 ≠ 门

| 类型 | 例子 | 处理 |
|---|---|---|
| 硬门 | 类型通过、schema 校验、跨层 import 拦截、行区间无缝、表面点认领、签字指纹 | 必须全绿 |
| 提示项 | 单文件行数（孤立看）、正则判三态、"有没有 memo" | 只进报告，不阻塞 |

能被一个词满足的门，必然教出作弊。

## 5. 与 MEMORY 交付门的映射

| MEMORY §6.3 | 本技能落点 |
|---|---|
| 门 1 内部代码测试 | C5 `gates/C5.md` 硬门 |
| 门 2 浏览器功能测试 | C6 `parity.md` |
| 门 3 与 pi-web 交叉比对 | C6 三维 diff（wire / DOM+a11y / 截图） |
| 门 4 用户手工验收 | X1「用户验收」 |
| 门 5 验收通过 | X2 关闭 run + 更新全景表 |

## 6. 与注释卫生纪律的关系

`docs/conventions/code-comment-hygiene.md` 要求「代码改了注释跟着改」。迁移场景的对应物：

- 改了设计 → 签字失效（脚本强制）
- 改了产物 → `record` 重记指纹
- 改了阶段契约 → `gen-workflow-doc --check` 在 CI 报红
- 改了架构规则 → D10 让能力设计立刻红
- 改了符号映射 → `check-symbols` 立刻红

**没有机器强制的纪律 = 建议**；这里五条都有脚本兜底。
