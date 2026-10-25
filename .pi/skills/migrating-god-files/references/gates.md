# 门目录 — 概念门、阶段门、代码实现三者对账

> 这份文档解决一个很具体的问题：`rules.md` 说"有 N 道门"、`phases.mjs` 里有一堆 `kind`、`checks.mjs` 里有一堆 `case`——三者过去没有任何机制保证一致。试点里出现过「文档写了门、代码里没有」和「实现了门、没有阶段引用」两种漂移，全靠人眼发现。
>
> 现在由 `scripts/check-gates-map.mjs` 校验三件事：① 每个阶段引用的 `kind` 在 `checks.mjs` 里真有 `case`（无幻影门）；② `checks.mjs` 的每个 `case` 至少被一个阶段引用（无死门）；③ 下表与 `phases.mjs` 逐字一致（无文档漂移）。`--write` 重生成下表，`--check`（默认）校验。

## 1. 概念门 vs 实现

| 层 | 是什么 | 在哪 |
| --- | --- | --- |
| **概念门**（20 道） | 一条"防止某类静默丢失"的判据，人话描述 | `rules.md §1` |
| **阶段门**（kind） | 阶段契约里 `checks[].kind` 的一项，可带参数 | `phases.mjs` |
| **实现** | `checks.mjs` 里一个 `case`，返回 `{ok, detail}` | `scripts/lib/checks.mjs` |

一个概念门可以由多个 kind 实现（如"证据分级"= `verification` + `review` + `trace`），一个 kind 也可以服务多个概念门（如 `file` 出现在 22 个阶段）。**所以不要试图一一对应**，要保证的是"没有幻影门、没有死门、文档不漂移"。

## 2. 全部 kind（自动生成）

<!-- KINDS:START（由 scripts/check-gates-map.mjs --write 生成，勿手改） -->
| kind | 层级 | 用在 | 判据 | 能抓 | 抓不到 | 反向用例 |
| --- | --- | --- | --- | --- | --- | --- |
| `acceptance` | 结构 | C6 / C7 | 验收阶梯 L1–L4(/L5) 达标；L6 需人签 | 六层阶梯缺层、L6 未签、签字像 agent | L6 用户是否真的看懂了界面 | ✅ ACCEPTANCE L6 未签 → 红 |
| `archRules` | 结构 | P2.5 | arch/rules.json 结构合法 | rules.json 结构缺项、层序非法 | 这套分层是否适合本项目 | — |
| `behaviorScripts` | 存在性 | C5 | 行为与脚本双向绑定 | 行为声明的脚本文件不存在 | 脚本是否真的断言了该行为 | — |
| `behaviors` | 结构 | C3 | 每条行为有源码证据与脚本 id | 行为无证据锚点、无脚本、重复 id | 行为清单是否覆盖了用户真正在意的点 | ✅ BEHAVIORS 没有 B- 行 → 红 |
| `capSpec` | 结构 | C3 | 规格里有用户故事、多文件多行区间覆盖、交互形态与 pi-web 布局映射 | 缺用户故事/源码行区间/交互机制/人工决策 | 故事写得对不对、机制选得好不好 | — |
| `capabilityPlan` | 结构 | P3 | 能力清单/拓扑序/裁线齐备 | god 未归入能力、拓扑序缺失 | 能力边界切得合不合理 | — |
| `changePropagation` | 结构 | C5 | 砍单/改契约时有变更单，视图打勾齐全，skip 有理由 | 砍单无变更单、视图未勾、skip 无理由 | 视图列表是否漏了某个真实受影响处 | ✅ P3 砍单无变更单 → 红 |
| `commMatrix` | 结构 | P2.5 | 通信矩阵每类交互唯一机制且有反例 | 交互矩阵缺「反例」列 | 选择的机制是否最优 | — |
| `contractAlign` | 结构 | C2 | 契约对齐表每行都指向契约/变更单 | 对齐行无契约指向、有差异无 CHG | 登记的命令是不是这个能力真正用到的 | ✅ C2 对齐行既无指向也无编号红 |
| `contractDelta` | 结构 | C2 | 差异收敛成 CHG 变更单 | 缺对齐表、无变更单编号 | 差异分类是否正确 | ✅ C2 有差异却无 CHG 号红 |
| `contractInventory` | 结构 | C2 | 源码端点/命令 ⊆ 契约 | 源码有、契约缺的端点（分母来自表面点） | god 自己不写 fetch 时（见 externalIo） | ✅ C2 源码端点未进契约红 |
| `contracts` | 存在性 | P1 | 外部接口契约文件齐备 | 契约文件缺/过小 | 契约内容是否与源码一致 | — |
| `conventions` | 结构 | P2.5 | 分层事实：layerPaths 必须指向仓库真实目录，AD 必须讲这个仓库 | 规则来自"想象"：layerPaths 指向不存在的目录 / AD 没提真实存在的层 | 分层是否合理（只保证文档与仓库事实一致） | ✅ CONV layerPaths 指向不存在的目录 → P2.5 红 |
| `coverage` | 结构 | C1 | 覆盖 ≥ 阈值 | 行区间空洞、重叠、drop 无条目 | 切分是否合理 | — |
| `decisionsClosed` | 结构 | X2 | 决策全部关闭 | 决策项没有结论/未关闭 | 决策本身对不对 | — |
| `denominator` | 结构 | C6 | 台账分母与来源文件条数/sha 一致（手填分母不认） | 分母无来源、sha 不匹配、条数与来源不符 | 来源文件本身是否正确 | ✅ C6 对账分母 → 条数与来源不符时红 |
| `design` | 结构 | C4 | D1–D16 设计门 | D1–D19 组合（覆盖/协议/图/出处/实践） | 设计是否优雅、是否过度分层 | ✅ D2 表面未认领 → 红 |
| `drift` | 结构 | C5 | OpenWiki 未过期 | 代码里有 @design 但设计无此元素 | 标注是否贴在正确的代码块上 | ✅ DRIFT 隐性设计 → 红 |
| `envReady` | 结构 | P1 | 端口/变量/构建/版本/夹具成文，关键条目在册 | 端口/变量/构建/版本未成文 | 环境是否真的能跑起来（那是 harness 的事） | ✅ ENV 环境矩阵缺项 → 红 |
| `externalIo` | 结构 | C2 | god 不写 fetch 时，沿 import 追到的命令也要在契约里 | 沿 import 追到但没登记的 HTTP 依赖 | 间接三层以上的动态依赖 | — |
| `fidelity` | 语义（须人签） | C6 | pi-web 独有的可及元素必须在 parity.md 有名有姓；覆盖率低于阈值判红 | pi-web 独有的可及元素没在差异表登记、覆盖率低于阈值、只拍了一侧 | 视觉细节（间距/色值/字重）；两个元素是否真的语义等价 | ✅ FIDELITY 缺快照 → 红 |
| `file` | 存在性 | C0 / C1 / C2 / C3 / C4 / C6 / C7 / H0 / H1 / H2 / H3 / P0 / P1 / P2 / P2.5 / P3 / P4 / X0 / X1 / X2 | 文件存在且 ≥ minBytes | 文件缺/过小/仍是铺底模板 | 文件里写的内容对不对 | ✅ P0 模板未填写时拒绝 |
| `fixtures` | 存在性 | P1 | 夹具 ≥ min 行或 ≥ min 文件 | 夹具目录为空 | 夹具是否覆盖真实数据形状 | — |
| `frontendArch` | 结构 | P2.5 | 前端约定八节齐备 + rules.json#frontend（层/状态分类/禁止写法/预算） | 前端八节缺项、状态分类不足 | 这些约定是否适合本项目前端 | ✅ FRONTEND rules 缺 frontend → 红 |
| `glob` | 存在性 | C1 | glob 命中的文件数 ≥ min | 匹配不到文件 | 文件内容 | ✅ GLOB 目录写法覆盖子孙且不跨包 |
| `godFingerprint` | 结构 | C0 | hashes 与当前文件一致 | god 文件 sha/行数与登记不符 | 是否该从这份源码迁移 | ✅ GODFINGERPRINT 行数不符 → 红 |
| `godRegistry` | 结构 | C0 | god 在 GODS.md 登记 | god 未在 GODS.md 登记 | GODS.md 是否完整 | — |
| `godRegistryClosed` | 结构 | P0 | GODS.md 登记集合闭合 | 登记为「待开始」却被跑（C0 阶段） | 状态是否被人为改成完成 | — |
| `godStatus` | 存在性 | C7 | god 状态已收口 | GODS.md 状态未更新为已完成 | 完成后是否真的等价 | — |
| `godsHaveR` | 结构 | P0 | 每个 god 有 R 级 | god 缺 R 级 | R 级判定是否合理 | — |
| `harness` | 结构 | P1 | registry 结构合法（captured 带快照、manual 带理由） | registry 结构非法、captured 缺快照 | 快照是否代表真实交互 | — |
| `heading` | 存在性 | C0 / C1 / C2 / C3 / C6 / C7 / H0 / H1 / H2 / H3 / P0 / P1 / P2 / P2.5 / P3 / P4 / X0 / X1 / X2 | 含精确标题 | 缺指定小节 | 小节内容 | ✅ HEADING 缺必需小节 → 红 |
| `headingAny` | 存在性 | C1 | 含任一候选标题 | 多个写法都接受时缺失 | 小节内容 | — |
| `humanSignoff` | 结构 | C3 / C4 / C6 | 这几份产物必须人工签字，agent 代签判红 | 缺签字/无 --saw 依据/agent 代签/签字后改动/改签链断裂（换人未先 unsign） | 签字人是否真的逐条看过（只有 --saw 可追溯） | ✅ C3 规格 agent 签字后仍拒绝 |
| `integration` | 结构 | C5 | 每个 HTTP 命令已换真实现，且留了联调证据 | 联调替换表缺行、真实现写成桩 | 替换后行为是否真的等价 | ✅ INTEGRATION 真实现写成桩 → 红 |
| `lines` | 结构 | C1 / C4 / C5 | 行区间闭合（structure / bind / landed 三档） | 行级三档（structure/bind/landed）空洞 | 迁移后的语义是否等价 | ✅ LINES 归属区间有缝 → 红 |
| `lspSource` | 结构 | C1 | 符号分母来自 tsserver 采集（meta 一致） | 符号分母不是 tsserver 采集 / 与 meta 不符 | 采集到的符号是否需要迁 | ✅ C1 手填分母不认：缺 meta 红 |
| `observations` | 结构 | C5 | 界面任务实施前要写 observations/<T-xx>.md（看到什么/差在哪/决定） | 界面任务没写观察 / 三段缺一 /「看到什么」没有可核对定位（路径:行号 或 30141 上的具体结构） | 观察写得对不对、有没有真去看 | ✅ OBS 观察缺三段 → C5 红 |
| `ownershipTypes` | 结构 | C1 | 区间类型合法且 owner/依据齐备 | 区间类型非法/越界 | 区间切得对不对 | ✅ OWNERSHIP 类型非法 → 红 |
| `parity` | 结构 | C6 | 重建后行为/结构对账通过 | blocked 超半、缺导航维度、结论不是闭集 | 「一致」是否为真（需 30141 采集） | ✅ C6 分类写 todo 时拒绝（闭集） |
| `placement` | 结构 | C4 / C5 | 落点在已声明的层里；adapters 不许写进 web；客户端不许 import node:* | 落点不在已声明层 / adapters 写进 web / 客户端组件 import node:* 或 core 源码 | 这个文件是不是该拆（只判位置，不判职责） | ✅ PLACEMENT adapters 写进 web → C4 红 |
| `plan` | 结构 | C4 | 任务表列齐且非空（S/M 级） | 任务表缺列/空行 | 任务拆得够不够细 | ✅ PLAN 缺计划 → C4 红 |
| `programAudit` | 存在性 | X1 | program run 审计通过 | 纲领审计小节缺失 | 审计结论是否正确 | — |
| `programPrereq` | 结构 | C0 / H0 | program run 的前置产物存在 | 能力 run 缺 program 前置产物 | 前置产物质量 | ✅ PROGRAMPREREQ 没关联 program → 红 |
| `quality` | 结构 | C5 | 质量预算与验收命令存在 | 预算超限（行数/props/复杂度） | 预算数字是否合理 | ✅ Q1 超行数 → 红 |
| `readlogCoverage` | 结构 | C3 | 原型里画了谁的界面，就得先读过谁（readlog 必须有记录） | 原型或布局映射点名的源文件，readlog 里没有阅读记录 | 读得是否仔细（有记录 ≠ 读过） | ✅ RLC 原型引用了没读过的文件 → C3 红 |
| `renderBoundary` | 结构 | C0 | 本能力渲染哪几个区域、哪些是别的能力的 chrome（CHARTER 的 ## 渲染边界） | CHARTER 缺「渲染边界」/宿主写成别的能力/没有一行 self/none 无理由 | 划分本身是否合理（哪块算别人的 chrome）——这是判断题 | ✅ RB 缺「渲染边界」→ C0 红 |
| `retro` | 结构 | C7 | 复盘含遗留项 | 复盘缺小节/缺教训 | 教训是否深刻 | — |
| `review` | 结构 | C5 | 双轴审查（Standards + Spec）无 ❌ | 12 项清单缺项/结论非法/fix 无 file:line/度量超限未被登记 | reviewer 的判断是否专业（清单填满照样可能没看出问题） | ✅ REVIEW 缺「死代码与重复」→ C5 红 |
| `rlevel` | 结构 | C0 | R 级已声明 | R 级缺失/非法 | 分级是否合理 | ✅ RLEVEL 缺 R 级 → 红 |
| `runtimeFit` | 结构 | C4 / C5 | 业务规则住 core、呈现逻辑住 web（ADR-0001 的分层是运行时，不是路径） | 元素缺 runtime / 服务端规则落 web / 呈现逻辑落 core / web 里出现 use-cases 目录 / web 直接 import node: | 这条规则到底是业务规则还是呈现规则——划线时人的判断 | ✅ RUNTIME 服务端规则落 web → C4 红 |
| `sectionClean` | 结构 | H3 / P2 / X0 | 小节内没有占位符/空行占位 | 指定小节里还有 ❌ | ❌ 的处理方式是否正确 | — |
| `signoff` | 结构 | C4 / H0 / P2.5 / P3 | 人已送签 | 产物未送签/签字后改动 | 签字人是否审过 | — |
| `specTests` | 结构 | C3 | 规格里的测试 ID 已落地 | 决策表缺测试 ID / ID 未落地 | 测试是否测到了点子上 | ✅ SPECS 锚点指向不存在的文件 → 红 |
| `specs` | 结构 | C3 | 决策表/规格有证据锚点且无占位 | 决策无证据锚点/含禁词 | 决策是否正确 | — |
| `stub` | 结构 | C5 | 本能力用到的 HTTP 命令桩就绪（桩 + 夹具齐备） | 本能力 HTTP 表面点无桩 | 桩的行为是否与真实现一致 | — |
| `stubPlan` | 结构 | P1 | 契约每条命令/事件都有桩与夹具，blocked 必须写理由 | 桩清单缺行/ready 但文件不在 | 桩的形状是否来自算法规格 | ✅ STUBPLAN 缺桩清单 → 红 |
| `surface` | 结构 | C1 | 表面枚举存在且按 kind 分账 | 表面点数量/分母来源 | 表面点是否被正确认领（那是 D2） | ✅ 表面漂移 --check 报红 |
| `symbols` | 结构 | C1 | 符号全集 ⊆ 符号表，且空归属数 0 | 符号遗漏/过期/虚报 | 符号是否值得迁 | ✅ SYMBOLS 漏符号 → 红 |
| `trace` | 结构 | C5 | 四向追踪闭合（任务↔元素↔行为↔验收） | 四向追踪断裂（任务↔元素↔行为↔测试） | 追踪关系是否符合真实依赖 | ✅ TRACE 设计元素无人实现 → 红 |
| `uiProto` | 结构 | C4 | ASCII 原型：主屏与空态两块，含交互态 | ASCII 原型缺块/缺区域词/缺交互态 | 原型是否好用、信息层级对不对 | — |
| `verification` | 结构 | C5 / C6 / P2 / X1 | gates/<id>.json 有运行记录且全 exit 0、未过期 | 证据缺失/失败/过期 | 命令是否覆盖了关键路径 | ✅ VERIFY 失败证据 → C5 红 |
| `volume` | 结构 | C5 | 判断型文档 ≤ 行数上限 | 工件超预算、符号表未去重、出现废弃文件 | 剩下的内容是否有价值 | ✅ VOLUME 判断型文档超 400 行 → 红 |
| `webScaffold` | 结构 | C5 | web 新代码只能落在 features/<slice>/ 等允许的根下，切片要有 hook/view 骨架 + 参照模板 | 组件落在 features/shell/app/ui 之外、切片缺 hook/view 骨架、缺 _template 参照、src 根下放组件 | 切片内部文件是否还在长大（那是行数/密度判据） | ✅ WEB 组件落在 src/components 下 → C5 红 |
| `wireTable` | 结构 | P1 | 命令表/事件表非空 | 命令/事件表为空 | 表里的端点是否完整 | — |
<!-- KINDS:END -->
