# 工作流：四作用域 16 阶段

> **本文件由 `scripts/gen-workflow-doc.mjs` 从 `scripts/lib/phases.mjs` 生成。不要手改。**
> 改了阶段契约就跑一次生成；`--check` 会在 CI 里对比，过期即红。

## 0. 作用域

| 作用域 | 阶段序列 | 一次还是多次 |
|---|---|---|
| `program` | P0 → P1 → P2 → P2.5 → P3 → P4 | 一次 |
| `chassis` | H0 → H1 → H2 → H3 | 一次 |
| `capability` | C0 → C1 → C2 → C3 → C4 → C5 → C6 → C7 | 每能力一次 |
| `cutover` | X0 → X1 → X2 | 一次 |

## 1. R 级裁剪

门带 `levels` 的只在对应 R 级运行；不带则全等级运行。

| 阶段 | 门 | 适用 R 级 |
|---|---|---|
| C1 | `surface.json` 有 ≥5 个表面点 | R1 / R2 / R3 |
| C3 | `specs/` 每份含端到端链路 / 决策表 / 落点 | R3 |
| C3 | specTests | R3 |
| C4 | 设计门 D1–D10（按 R 级裁剪） | R1 / R2 / R3 |
| C4 | plan | R2 / R3 |
| C4 | `design/manifest.json` 有效签字（改动即失效） | R2 / R3 |
| C5 | 质量预算：文件行数 / 复杂度 / props 上限 | R1 / R2 / R3 |
| C5 | `@design` 标注 ↔ 设计元素（无未实现、无隐性设计） | R2 / R3 |
| C5 | trace | R2 / R3 |
| C6 | `parity.md` 含小节 `## 渲染预算` | R3 |

## 2. 阶段

### 作用域 `program`

## P0 纲领与分级

**目标**：把「迁什么、到什么程度算完、哪个 god 有多危险」变成可复现的事实

**输入**：`godRegistry` · `docs/adr/*` · `ref_projects/pi-web 源码`

**子步骤**

| 子步骤 | 做什么 |
|---|---|
| `p0.1` | 扫描 >1000 行的生产文件，与 GODS.md 对账（清单必须封闭） |
| `p0.2` | 给每个 god 定 R 级：R3 中枢 / R2 复杂界面+数据 / R1 独立模块 |
| `p0.3` | 写成功定义与**不做清单**（不做清单比做清单更能防漂移） |
| `p0.4` | 容量假设：人周 × 里程碑，并写明「偏差 >30% 就重排」 |
| `p0.5` | 逐条送签 |

**产出**：`PROGRAM.md` · `GODS.md（补 R 级列）`

**模板**：`references/templates/PROGRAM.md` → `PROGRAM.md`（`init` 会铺到目标路径，顶部横幅不删即判红）

**门（机器判据）**

- 存在 `PROGRAM.md`（≥400 B）
- `PROGRAM.md` 含小节 `## 1. 成功定义`
- `PROGRAM.md` 含小节 `## 2. 不做清单`
- `PROGRAM.md` 含小节 `## 3. 容量假设`
- >1000 行文件全部已登记（god 清单封闭）
- 每个 god 有 R1/R2/R3

**只验这一项**（不用整阶段重跑）：`check-phase.mjs --run <run> --phase P0`

**失败处理**：god 未登记 → 先补全景表（这是唯一允许改全景表的时机之一，S7/X2 是另一次）。参考仓库不可用 → 停，不要用记忆代替清单。

## P1 契约冻结

**目标**：把「对外承诺」一次性冻结：wire / 数据格式 / 路由 / i18n / 设计系统 / 交互

**输入**：`GODS.md` · `pi-web 冻结快照（sha1）` · `OpenWiki（drift 校验）`

**子步骤**

| 子步骤 | 做什么 |
|---|---|
| `p1.1` | 抽 wire 契约：命令 / 事件 / 错误码，每条带 path:line |
| `p1.2` | 抽数据格式：session JSONL 字段与兼容规则，用真实样本做 fixture |
| `p1.3` | 抽路由契约：深链矩阵（哪些参数、刷新/后退/分享行为） |
| `p1.4` | 抽 i18n 与设计系统：命名空间 + token 命名（不逐个 token 化） |
| `p1.5` | 抽交互契约：快捷键、焦点顺序、通知与失效语义 |
| `p1.6` | 搭 harness：capture(30141) / assert(30041) 两侧 + 归一化规则 |
| `p1.7` | 双读验证：同一 fixture 被 pi-web 与 evo-pi 都解析成功 |
| `p1.8` | 写桩清单 contracts/stubs.md：每条契约命令/事件一行，桩实现路径 + 夹具路径 + 状态（ready / blocked+理由） |

**产出**：`contracts/{wire,data-format,routes,i18n,design-system,interaction}.md` · `contracts/schema.ts` · `fixtures/` · `harness/` · `contracts/stubs.md（前后端独立开发用的桩清单）` · `environment.md（端口/变量/构建/版本/夹具）`

**模板**：`references/templates/stubs.md` → `contracts/stubs.md` · `references/templates/environment.md` → `environment.md`（`init` 会铺到目标路径，顶部横幅不删即判红）

**门（机器判据）**

- 6 份外部契约齐备（wire / data-format / routes / i18n / design-system / interaction）
- 存在 `contracts/schema.ts`（≥80 B）
- harness 有 capture / assert / 归一化
- stubPlan
- envReady
- 至少一个真实 .jsonl fixture
- `contracts/wire.md` 含小节 `## 命令`
- `contracts/wire.md` 含小节 `## 事件`
- wireTable

**只验这一项**（不用整阶段重跑）：`check-phase.mjs --run <run> --phase P1`

**失败处理**：某份契约抽不出来 → 说明该契约的源码还没读透，回 P0/P2 补读；**不要**用"暂定"填表，暂定会变成事实。

## P2 骨架贯通

**目标**：一条最小路径通电：列表 → 读单会话上下文 → 错误码分支（发送/流式/落盘/URL 同步留给能力 C5）

**输入**：`P1 全部契约` · `现有 packages/core 读侧`

**子步骤**

| 子步骤 | 做什么 |
|---|---|
| `p2.1` | 接线四层：route → use-case → port → adapter（端口注入，不在 route 顶层做 composition root） |
| `p2.2` | 打通读侧真路径（复用既有 read-side） |
| `p2.3` | 打通写侧与流式（单一入口 + 唯一 reducer） |
| `p2.4` | 接 harness：实跑一遍并出报告 |
| `p2.6` | 记证据：record-verification --id P2 --cmd "<贯通路径的 smoke 命令>"（覆盖 HTTP→use-case→adapter；纯 node --check 不算） |
| `p2.5` | 浏览器亲验（用户）：截图 + 交互走一遍 |

**产出**：`可运行代码` · `harness/report/skeleton.md` · `gates/P2.json（真实 smoke 证据）`

**门（机器判据）**

- 存在 `harness/report/skeleton.md`（≥200 B）
- `harness/report/skeleton.md` 含小节 `## 硬门`
- `harness/report/skeleton.md` 的「硬门」小节无 ❌/FAIL
- `harness/report/skeleton.md` 含小节 `## 走通的路径`
- verification

**只验这一项**（不用整阶段重跑）：`record-verification.mjs --run <run> --id <阶段> --from-plan plans/<cap>.md` · `check-phase.mjs --run <run> --phase P2`

**失败处理**：走不通就缩小路径（少一个交互），不要缩小层级（少一层架构）。hydration warning 不为 0 → 先修边界，再谈功能。

## P2.5 全局架构设计

**目标**：组件之间怎么通信、通知走哪条通道、状态归谁、错误怎么分类——一次定清

**输入**：`PROGRAM.md（R 级）` · `P1 契约` · `P2 实际代码`

**子步骤**

| 子步骤 | 做什么 |
|---|---|
| `p2.5.1` | 层间规则与禁止边（与 ADR 0003 对齐） |
| `p2.5.2` | 通信机制矩阵：每类交互指定唯一机制，空白即停 |
| `p2.5.3` | 状态归属教义：什么进 server cache / store / URL / 组件 |
| `p2.5.4` | 错误分类（封闭枚举）+ 失败语义（三态、降级、重试边界） |
| `p2.5.5` | 流式与订阅：唯一入口、唯一 reducer、背压与取消 |
| `p2.5.6` | 前端架构约定：arch/frontend.md 八节 + rules.json#frontend（层/状态分类/禁止写法/预算） |
| `p2.5.7` | 落 arch/rules.json（机器可读），并逐条送签 |

**产出**：`ARCHITECTURE.md` · `arch/{layers,communication,states,errors,streaming}.md` · `arch/rules.json`

**模板**：`references/templates/ARCHITECTURE.md` → `ARCHITECTURE.md` · `references/templates/arch-rules.json` → `arch/rules.json` · `references/templates/frontend-arch.md` → `arch/frontend.md`（`init` 会铺到目标路径，顶部横幅不删即判红）

**门（机器判据）**

- 存在 `ARCHITECTURE.md`（≥400 B）
- `ARCHITECTURE.md` 含小节 `## 1. 层与禁止边`
- `ARCHITECTURE.md` 含小节 `## 2. 通信机制`
- `ARCHITECTURE.md` 含小节 `## 3. 状态归属`
- `ARCHITECTURE.md` 含小节 `## 5. 流式与订阅`
- `arch/rules.json` 可机器加载（层序/禁止边/机制/上限）
- frontendArch
- 通信机制矩阵覆盖 `mechanisms` 全集，且有「反例」列
- conventions
- `ARCHITECTURE.md` 有效签字（改动即失效）

**只验这一项**（不用整阶段重跑）：`check-phase.mjs --run <run> --phase P2.5`

**失败处理**：通信矩阵出现空格 → 停，那说明有一类交互没人负责，后面会在每个能力里被重拍一次。禁止写"待定"。

## P3 能力切片与排期

**目标**：把全部 god 归到若干能力 + 1 个底盘，定拓扑序与裁线

**输入**：`PROGRAM.md` · `P1 契约` · `P2 结果` · `P2.5 架构`

**子步骤**

| 子步骤 | 做什么 |
|---|---|
| `p3.1` | 按能力（不是按文件）归组；一个 god 只能属一个能力 |
| `p3.2` | 定拓扑序（依赖无环）与每个能力的 R 级 |
| `p3.3` | M1/M2 裁线：M1 = 能当日常工具用 |
| `p3.4` | 每能力给 PR 预估与验收物（PM 视角） |
| `p3.5` | 逐条送签（裁线是产品决策） |

**产出**：`CAPABILITIES.md`

**模板**：`references/templates/CAPABILITIES.md` → `CAPABILITIES.md`（`init` 会铺到目标路径，顶部横幅不删即判红）

**门（机器判据）**

- 存在 `CAPABILITIES.md`（≥300 B）
- `CAPABILITIES.md` 含小节 `## 1. 能力清单`
- `CAPABILITIES.md` 含小节 `## 2. 拓扑序`
- `CAPABILITIES.md` 含小节 `## 3. 裁线`
- 每个 god 恰好归入一个能力，且每行有 R 级
- `CAPABILITIES.md` 有效签字（改动即失效）

**只验这一项**（不用整阶段重跑）：`check-phase.mjs --run <run> --phase P3`

**失败处理**：god 归不进任何能力 → 要么它其实是底盘，要么能力切分错了。一个 god 想归两个能力 → 先拆 god 的职责，再归能力。

## P4 割接预案

**目标**：割接不是一个日期，是一套可演练、可回滚的流程

**输入**：`CAPABILITIES.md` · `数据兼容事实（PI_CODING_AGENT_DIR 共享）`

**子步骤**

| 子步骤 | 做什么 |
|---|---|
| `p4.1` | 割接日 + 双跑窗口 + pi-web 冻结归档方式 |
| `p4.2` | 回滚条件与回滚命令（必须可执行，不是口号） |
| `p4.3` | 验收口径：对齐 MEMORY §6.3 五道门 |
| `p4.4` | 预演标准：什么算预演通过 |

**产出**：`cutover/PLAN.md`

**模板**：`references/templates/cutover-plan.md` → `cutover/PLAN.md`（`init` 会铺到目标路径，顶部横幅不删即判红）

**门（机器判据）**

- 存在 `cutover/PLAN.md`（≥300 B）
- `cutover/PLAN.md` 含小节 `## 回滚`
- `cutover/PLAN.md` 含小节 `## 验收口径`
- `cutover/PLAN.md` 含小节 `## 预演标准`

**只验这一项**（不用整阶段重跑）：`check-phase.mjs --run <run> --phase P4`

**失败处理**：回滚命令不可执行 → 等于没有回滚。先在 X0 演练一次，再写进 PLAN。

### 作用域 `chassis`

## H0 底盘契约

**目标**：zone / token / 路由 / 焦点 / 快捷键 / i18n 命名空间的具体契约，消费 AD 不得自定机制

**输入**：`arch/rules.json` · `contracts/{design-system,routes,i18n,interaction}.md`

**子步骤**

| 子步骤 | 做什么 |
|---|---|
| `h0.1` | zone 骨架与几何（区域名、最小/最大、断点） |
| `h0.2` | token 命名与命名空间（不逐个 token 化） |
| `h0.3` | 路由表与 URL 状态契约（哪些进 URL） |
| `h0.4` | 焦点与快捷键契约（焦点环、trap、skip link、键位表） |
| `h0.5` | i18n 命名空间划分 |
| `h0.6` | 逐条送签 |

**产出**：`chassis/CONTRACT.md`

**模板**：`references/templates/chassis-contract.md` → `chassis/CONTRACT.md`（`init` 会铺到目标路径，顶部横幅不删即判红）

**门（机器判据）**

- 存在 `chassis/CONTRACT.md`（≥400 B）
- `chassis/CONTRACT.md` 含小节 `## 1. 区域与几何`
- `chassis/CONTRACT.md` 含小节 `## 2. Token 命名`
- `chassis/CONTRACT.md` 含小节 `## 3. 路由与 URL`
- `chassis/CONTRACT.md` 含小节 `## 4. 焦点与键盘`
- `chassis/CONTRACT.md` 含小节 `## 5. i18n 命名空间`
- 纲领 run 存在：`ARCHITECTURE.md` / `arch/rules.json`
- `chassis/CONTRACT.md` 有效签字（改动即失效）

**只验这一项**（不用整阶段重跑）：`check-phase.mjs --run <run> --phase H0`

**失败处理**：底盘契约与 AD 冲突 → 改底盘契约，不改 AD（AD 是全局承诺）。

## H1 布局与面板

**目标**：zone 容器、可拖拽面板、断点、持久化——不承载任何业务状态

**输入**：`chassis/CONTRACT.md`

**子步骤**

| 子步骤 | 做什么 |
|---|---|
| `h1.1` | zone 容器与几何实现（最小/最大/默认，走 contract 的数字） |
| `h1.2` | 可拖拽面板 + 折叠/展开（状态来自 store，不来自组件） |
| `h1.3` | 断点策略与移动端形态 |
| `h1.4` | 面板尺寸与开合持久化（刷新可恢复） |
| `h1.5` | 骨架屏/占位，避免布局跳动 |

**产出**：`布局代码` · `chassis/layout.md`

**门（机器判据）**

- 存在 `chassis/layout.md`（≥200 B）
- `chassis/layout.md` 含小节 `## 断点矩阵`
- `chassis/layout.md` 含小节 `## 面板持久化`
- `chassis/layout.md` 含小节 `## 不承载的业务状态`

**只验这一项**（不用整阶段重跑）：`check-phase.mjs --run <run> --phase H1`

**失败处理**：断点矩阵过不了 → 先砍形态（少一个断点），不要用一个断点凑合所有宽度。

## H2 应用框架

**目标**：路由/URL、错误边界、通知通道、主题、i18n runtime、键盘映射、a11y primitives

**输入**：`chassis/CONTRACT.md` · `arch/{communication,errors,states}.md`

**子步骤**

| 子步骤 | 做什么 |
|---|---|
| `h2.1` | 路由与 URL 同步（深链/后退/刷新矩阵） |
| `h2.2` | 错误边界 + 全局 loading/Suspense 边界 |
| `h2.3` | 通知通道：单一 sink、幂等、去重（AD 的机制，不自造） |
| `h2.4` | 主题/密度/token 应用 + i18n runtime |
| `h2.5` | 键盘映射 + 焦点管理（trap/return/skip link） |

**产出**：`框架代码` · `chassis/framework.md`

**门（机器判据）**

- 存在 `chassis/framework.md`（≥250 B）
- `chassis/framework.md` 含小节 `## 路由与 URL 矩阵`
- `chassis/framework.md` 含小节 `## 通知通道`
- `chassis/framework.md` 含小节 `## 键盘与焦点`

**只验这一项**（不用整阶段重跑）：`check-phase.mjs --run <run> --phase H2`

**失败处理**：通知通道出现第二个 sink → 立刻合并；两个 sink 是"通知重复弹出"的根因。

## H3 底盘验收

**目标**：结构不变量全集对账 + 与 pi-web 并排对照；未分类差异必须为 0

**输入**：`H1` · `H2` · `surface.json（chassis 类表面点）`

**子步骤**

| 子步骤 | 做什么 |
|---|---|
| `h3.1` | 断点矩阵实跑（1280/1024/390）：不重叠、不塌陷、无横向滚动 |
| `h3.2` | 键盘走查：每个 trap / 返回 / skip link |
| `h3.3` | token 与文案 lint：无裸值、无硬编码 |
| `h3.4` | 与 pi-web 并排截图对照，差异逐条分类 |

**产出**：`chassis/PARITY.md`

**门（机器判据）**

- 存在 `chassis/PARITY.md`（≥250 B）
- `chassis/PARITY.md` 含小节 `## 结构不变量`
- `chassis/PARITY.md` 含小节 `## 差异分类`
- `chassis/PARITY.md` 的「结构不变量」小节无 ❌/FAIL

**只验这一项**（不用整阶段重跑）：`check-phase.mjs --run <run> --phase H3`

**失败处理**：差异分类未清零 → 不许进能力开发；底盘差异会被每个能力继承放大。

### 作用域 `capability`

## C0 立项

**目标**：把本能力的范围与指纹钉死，并确认它已在能力表与全景表登记

**输入**：`CAPABILITIES.md` · `GODS.md` · `arch/rules.json`

**子步骤**

| 子步骤 | 做什么 |
|---|---|
| `c0.1` | 从 CAPABILITIES.md 取本能力条目（含 R 级） |
| `c0.2` | 钉指纹：涉及的每个 god 的行数 + sha1，以磁盘为准 |
| `c0.3` | 写不做清单与跨能力边界（谁不归我管） |
| `c0.4` | state.mjs init --scope capability --rlevel <R> 建档 |

**产出**：`CHARTER.md`

**模板**：`references/templates/CHARTER.md` → `CHARTER.md`（`init` 会铺到目标路径，顶部横幅不删即判红）

**门（机器判据）**

- 存在 `CHARTER.md`（≥300 B）
- `CHARTER.md` 含小节 `## 1. 范围`
- `CHARTER.md` 含小节 `## 2. 基线指纹`
- `CHARTER.md` 含小节 `## 3. 不做清单`
- renderBoundary
- god 指纹（行数 + sha1）与磁盘一致
- 全景表存在、目标 god 已登记、登记后未漂移
- 本 run 已声明 R 级
- 纲领 run 存在：`PROGRAM.md` / `CAPABILITIES.md` / `arch/rules.json`

**只验这一项**（不用整阶段重跑）：`check-phase.mjs --run <run> --phase C0`

**失败处理**：指纹与磁盘不一致 → 源码动过，回 C0 重钉；不要拿旧指纹继续。

## C1 结构对账与表面枚举

**目标**：「读全」机器可判：符号全集有分母、行区间无缝、**每个可交互表面点被枚举**

**输入**：`CHARTER.md` · `LSP` · `pi-web 源码`

**子步骤**

| 子步骤 | 做什么 |
|---|---|
| `c1.1` | code_resolve 导出符号全集到 evidence/symbols-<god>.md |
| `c1.2` | 分段精读，写 readlog：行区间 + 行为要点 |
| `c1.3` | 写 ownership：行区间 → feature / chassis / infra / drop，区间无缝 |
| `c1.4` | 写 symbol-map：每个符号 → 归属 / evo 落点 / 状态 / 理由（drop 必须给理由） |
| `c1.5` | enumerate-surface 枚举交互表面点（handler/命令/事件/URL/key/token/热键） |
| `c1.6` | state.mjs god 登记分母；state.mjs surface 登记表面点总数 |

**产出**：`evidence/symbols-*.md` · `symbol-map.md` · `ownership.md` · `cut-list.md` · `surface.json`

**模板**：`references/templates/ownership.md` → `ownership.md` · `references/templates/cut-list.md` → `cut-list.md`（`init` 会铺到目标路径，顶部横幅不删即判红）

**门（机器判据）**

- `evidence/^symbols-.*\.md$` 至少一个文件（≥500 B）
- 存在 `readlog.md`（≥100 B）
- `readlog.md` 含小节 `## 阅读日志`
- 存在 `ownership.md`（≥100 B）
- headingAny
- `ownership.md` 的行区间无缝覆盖 1..N
- ownershipTypes
- lines
- symbols
- 符号全集来源 = LSP（AST 降级即结论作废）
- `surface.json` 有 ≥5 个表面点（仅 R1/R2/R3）

**只验这一项**（不用整阶段重跑）：`check-lines.mjs --run <run> --mode structure` · `check-lines.mjs --run <run> --mode <structure|bind|landed>` · `check-symbols.mjs --run <run>` · `enumerate-surface.mjs --run <run> · claim-surfaces.mjs --run <run> --report` · `check-phase.mjs --run <run> --phase C1`

**失败处理**：LSP 报 `No active LSP clients are ready` → 先诊断启动，不要换 grep（会得到差一个数量级的"假全"）。表面点枚举不出 → 检查源目录，不要手写几条凑数。

## C2 契约对齐

**目标**：本能力用到的命令/事件/URL/i18n/token 都在冻结契约里；要改就提变更单

**输入**：`contracts/*.md（P1）` · `surface.json`

**子步骤**

| 子步骤 | 做什么 |
|---|---|
| `c2.1` | 逐条对齐：本能力的命令/事件/路由/key/token 在契约中的位置 |
| `c2.2` | 差异写成 delta 行；非空则提契约变更单（版本 +1） |
| `c2.3` | 变更单评估：影响哪些其他能力 |

**产出**：`contract-delta.md`

**门（机器判据）**

- 存在 `contract-delta.md`（≥150 B）
- `contract-delta.md` 含小节 `## 对齐表`
- contractAlign
- 契约 delta 为空，或每条 delta 有变更单号
- contractInventory
- externalIo

**只验这一项**（不用整阶段重跑）：`check-contracts.mjs --run <run>` · `check-phase.mjs --run <run> --phase C2`

**失败处理**：delta 非空 → 走契约变更单并评估影响面；**不许**在本能力内私改契约。

## C3 行为规格

**目标**：行为清单是交付分母：每条行为有 script_id、有证据；零孤儿脚本

**输入**：`surface.json` · `ownership.md` · `contract-delta.md` · `pi-web 源码`

**子步骤**

| 子步骤 | 做什么 |
|---|---|
| `c3.1` | 写 spec.md：用户故事 + 源码行区间覆盖（多文件多区间） + 交互与导航（弹窗还是路由，带 path:line） + 与 pi-web 的布局映射；写完请用户签字 |
| `c3.2` | 按表面点写行为行：ID / 触发 / 预期 / 证据 path:line / script_id |
| `c3.2` | 每条行为在 harness/registry.json 登记脚本 |
| `c3.3` | R3 另写 specs/：端到端链路 + 决策表 + 落点 |
| `c3.4` | 核对：无行为缺口（表面点全被认领） |

**产出**：`spec.md` · `behaviors.md` · `specs/*.md（仅 R3）` · `harness/registry.json`

**模板**：`references/templates/spec.md` → `spec.md` · `references/templates/behaviors.md` → `behaviors.md`（`init` 会铺到目标路径，顶部横幅不删即判红）

**门（机器判据）**

- 存在 `spec.md`（≥400 B）
- capSpec
- readlogCoverage
- humanSignoff
- 存在 `behaviors.md`（≥200 B）
- `behaviors.md` 含小节 `## 行为清单`
- 行为 ↔ 脚本双向绑定（无缺 script_id、无孤儿脚本），每条有 path:line
- `specs/` 每份含端到端链路 / 决策表 / 落点（仅 R3）
- specTests（仅 R3）

**只验这一项**（不用整阶段重跑）：`check-specs.mjs --run <run>` · `check-phase.mjs --run <run> --phase C3`

**失败处理**：某条行为写不出预期 → 说明源码还没读到那一层，回 C1 精读。表面点无法认领 → 写进 excluded 并给理由，不许留空。

## C4 能力设计

**目标**：分解 / 接口 / 协议 / 状态 / 时序 / 模式 / 预算，外加实施图纸（组件树、hook、store、图）——设计可校验，不是散文

**输入**：`behaviors.md` · `surface.json` · `contract-delta.md` · `arch/rules.json`

**子步骤**

| 子步骤 | 做什么 |
|---|---|
| `c4.1` | 职责分解：表面点 + 行为聚类成原子职责，逐个判「容器 / 展示」 |
| `c4.2` | 接口与端口：签名 + 前置后置 + 错误语义，写成 TS 骨架（进 tsc） |
| `c4.3` | 协议：命令/事件/幂等/取消/重试；与 P1 契约的 delta |
| `c4.4` | store 设计：每 state 唯一 owner + 订阅者 + 生命周期，并画状态流图 |
| `c4.5` | 序列图：每个跨边界流程一张，端口必须作为参与者出现（接口是被调用的） |
| `c4.6` | 关键取舍：症状 → 选了什么 → 被否方案 → 错判成本（写进 components.md 末尾） |
| `c4.7` | 质量预算：行数/复杂度/props/渲染/三态/文案，全部给数字 |
| `c4.10` | 静态视图：components.md 用 mermaid 类图/流程图，组件标 «container»/«presenter»、hook 标 «hook»、store 标 «store»，依赖用 `-->`、订阅用 `..>` |
| `c4.11` | 源码溯源：每个元素的 sources 必须是本 god 的行区间，且与 ownership 归属逐段一致；派生元素写 rationale + derivedFrom |
| `c4.12` | 动态视图：dynamics.md 至少一张 sequenceDiagram（端口全部出现）+ 每个 store 一张 stateDiagram |
| `c4.13` | 测试策略：每层的测试写在哪、挡什么错（写进 quality.md，测试同学据此排期） |
| `c4.8` | 跑 design-gate（C4 段自动 --design-only），逐条送签 |
| `c4.9` | 用 superpowers:writing-plans 产出 plans/<cap>.md：任务 / 设计元素 / 行为 / 验收命令 / 测试 ID |

**产出**：`design/manifest.json` · `design/components.md（UML 静态视图：组件/hook/store 与依赖订阅）` · `design/dynamics.md（动态视图：序列图 + 状态流图）` · `design/quality.md（预算 + 测试策略）` · `design/ui.md（ASCII 原型：主屏 + 空态 + 交互态，必须人工审核）` · `design/interfaces.ts（类型骨架，被 components.md 引用）` · `design/sequences/*.md（R3 单列长链路）` · `plans/*.md（R2/R3）`

**模板**：`references/templates/design-manifest.json` → `design/manifest.json` · `references/templates/ui.md` → `design/ui.md` · `references/templates/components.md` → `design/components.md` · `references/templates/dynamics.md` → `design/dynamics.md` · `references/templates/quality.md` → `design/quality.md`（`init` 会铺到目标路径，顶部横幅不删即判红）

**门（机器判据）**

- 存在 `design/manifest.json`（≥200 B）
- 存在 `design/interfaces.ts`（≥100 B）
- 存在 `design/components.md`（≥200 B）
- 存在 `design/dynamics.md`（≥200 B）
- 存在 `design/quality.md`（≥200 B）
- 存在 `design/ui.md`（≥300 B）
- uiProto
- 设计门 D1–D10（按 R 级裁剪）（仅 R1/R2/R3）
- placement
- runtimeFit
- lines
- plan（仅 R2/R3）
- `design/manifest.json` 有效签字（改动即失效）（仅 R2/R3）
- humanSignoff

**只验这一项**（不用整阶段重跑）：`design-gate.mjs --run <run>` · `check-lines.mjs --run <run> --mode <structure|bind|landed>` · `check-phase.mjs --run <run> --phase C4`

**失败处理**：设计门红在 D3（state 多 owner）→ 先决定真源，再画图。D8 红 → 那个模式没有观察到的症状，删掉它。**不要为了过门补字段**（那是在伪造证据）。

## C5 实现

**目标**：任务级执行：每个任务 TDD 落地、机器验证、双轴审查；设计与实现不漂移

**输入**：`plans/*.md` · `design/manifest.json` · `behaviors.md` · `契约冻结`

**子步骤**

| 子步骤 | 做什么 |
|---|---|
| `c5.1` | 在一个 worktree + 独立分支里开工，按 plans 的 T-xx 顺序推进 |
| `c5.2` | 契约冻结 → 前后分离：先用桩把前端打通（桩是契约实现，返回夹具而非现编形状） |
| `c5.3` | 每个任务 TDD：先写断言（红）再写实现（绿）；红灯不许改测试 |
| `c5.4` | 代码标 @design <元素ID>，state.mjs task 记账，便于中断续跑 |
| `c5.5` | record-verification 真跑验收命令，落 gates/C5.json |
| `c5.6` | 每个 PR 前 requesting-code-review 双轴审查，落 review.md |
| `c5.7` | 联调：桩逐一换成真实现，落 integration.md（命令 / 桩 / 真实现 / 联调证据），行为脚本仍绿 |

**产出**：`代码` · `gates/C5.json（机器证据）` · `review.md（R2/R3）`

**模板**：`references/templates/integration.md` → `integration.md` · `references/templates/review.md` → `review.md`（`init` 会铺到目标路径，顶部横幅不删即判红）

**门（机器判据）**

- verification
- observations
- lines
- 质量预算：文件行数 / 复杂度 / props 上限（仅 R1/R2/R3）
- `@design` 标注 ↔ 设计元素（无未实现、无隐性设计）（仅 R2/R3）
- trace（仅 R2/R3）
- review
- placement
- runtimeFit
- webScaffold
- changePropagation
- volume
- behaviorScripts
- stub
- integration

**只验这一项**（不用整阶段重跑）：`record-verification.mjs --run <run> --id <阶段> --from-plan plans/<cap>.md` · `check-lines.mjs --run <run> --mode <structure|bind|landed>` · `check-trace.mjs --run <run>` · `check-volume.mjs --run <run>` · `check-phase.mjs --run <run> --phase C5`

**失败处理**：超行数 → 拆职责，不是拆文件。漂移报"隐性设计" → 要么补进设计，要么删代码。红灯不许改测试迁就实现。

## C6 行为对账

**目标**：同一脚本：30141 采集 / 30041 断言；差异逐条分类，未分类 = 0

**输入**：`behaviors.md` · `harness/` · `design/quality.md`

**子步骤**

| 子步骤 | 做什么 |
|---|---|
| `c6.1` | 跑全量行为脚本（capture → assert） |
| `c6.2` | 三维 diff：wire 调用 / DOM+a11y / 截图 |
| `c6.3` | 逐条分类：可接受 / 缺陷 / 有意偏离（附理由） |
| `c6.4` | R3 另测渲染预算：会话切换与流式更新 |

**产出**：`parity.md`

**模板**：`references/templates/acceptance.md` → `acceptance.md` · `references/templates/parity.md` → `parity.md`（`init` 会铺到目标路径，顶部横幅不删即判红）

**门（机器判据）**

- 存在 `parity.md`（≥250 B）
- `parity.md` 含小节 `## 行为对账结果`
- `parity.md` 含小节 `## 差异分类`
- 每条行为有对账结果，未分类差异 = 0
- denominator
- fidelity
- humanSignoff
- acceptance
- verification
- `parity.md` 含小节 `## 渲染预算`（仅 R3）

**只验这一项**（不用整阶段重跑）：`record-verification.mjs --run <run> --id <阶段> --from-plan plans/<cap>.md` · `check-phase.mjs --run <run> --phase C6`

**失败处理**：差异未分类 → 不许 advance。无法自动采集的行为标 `kind: manual` 并留操作者签名，不许从对账表里删掉。

## C7 收割回灌

**目标**：教训变成规则/契约/技能，而不是留在对话里

**输入**：`本能力全部产出`

**子步骤**

| 子步骤 | 做什么 |
|---|---|
| `c7.1` | 复盘：哪些设计判断错了、哪些门太松/太紧 |
| `c7.2` | 每条教训指定落地位置（规则文件 / 契约变更 / issue） |
| `c7.3` | 跨能力问题提到 Program（待决项） |
| `c7.4` | 回写 GODS.md 与 CAPABILITIES.md 状态 |
| `c7.5` | L6 人工验收：acceptance.md 的 L6 行写签字人与结论（agent 不得代签） |

**产出**：`retro.md` · `acceptance.md（L6 人工验收已签）` · `GODS.md / CAPABILITIES.md 状态更新`

**门（机器判据）**

- 存在 `retro.md`（≥150 B）
- `retro.md` 含小节 `## 教训与落地`
- 每条教训有落地位置
- acceptance
- 全景表状态已更新为「已完成」

**只验这一项**（不用整阶段重跑）：`check-phase.mjs --run <run> --phase C7`

**失败处理**：教训没有落地位置 → 转 issue 或写进 `arch/rules.json`；留在 retro 里等于没发生。

### 作用域 `cutover`

## X0 割接预演

**目标**：用真实数据副本在 30041 跑完整日流程，并演练回滚

**输入**：`全部能力 C6 通过` · `cutover/PLAN.md`

**子步骤**

| 子步骤 | 做什么 |
|---|---|
| `x0.1` | 真实数据副本（不写 live ~/.pi/agent） |
| `x0.2` | 跑完整日流程：开项目 → 多会话 → 发送 → 中断 → 恢复 → 文件预览 |
| `x0.3` | 演练回滚：实跑一次回滚命令 |
| `x0.4` | 已知缺陷清单交用户确认 |

**产出**：`cutover/REHEARSAL.md`

**模板**：`references/templates/cutover-rehearsal.md` → `cutover/REHEARSAL.md`（`init` 会铺到目标路径，顶部横幅不删即判红）

**门（机器判据）**

- 存在 `cutover/REHEARSAL.md`（≥250 B）
- `cutover/REHEARSAL.md` 含小节 `## 全日流程`
- `cutover/REHEARSAL.md` 含小节 `## 回滚演练`
- `cutover/REHEARSAL.md` 的「全日流程」小节无 ❌/FAIL

**只验这一项**（不用整阶段重跑）：`check-phase.mjs --run <run> --phase X0`

**失败处理**：预演失败 → 回对应能力修，不要在割接现场修。

## X1 割接

**目标**：big-bang 切换；用户浏览器验收；pi-web 冻结归档

**输入**：`X0 通过`

**子步骤**

| 子步骤 | 做什么 |
|---|---|
| `x1.1` | 按 runbook 执行割接 |
| `x1.2` | 用户按 MEMORY §6.3 五道门验收 |
| `x1.3` | pi-web 冻结归档（只读） |

**产出**：`cutover/RUNBOOK-executed.md`

**门（机器判据）**

- 存在 `cutover/RUNBOOK-executed.md`（≥200 B）
- `cutover/RUNBOOK-executed.md` 含小节 `## 执行记录`
- `cutover/RUNBOOK-executed.md` 含小节 `## 用户验收`
- verification
- programAudit

**只验这一项**（不用整阶段重跑）：`record-verification.mjs --run <run> --id <阶段> --from-plan plans/<cap>.md` · `check-phase.mjs --run <run> --phase X1`

**失败处理**：用户验收未过 → 回 X0 重演，不要"先上线再补"。

## X2 复盘

**目标**：遗留项全部有 issue 号；规则/契约更新已提交

**输入**：`X1`

**子步骤**

| 子步骤 | 做什么 |
|---|---|
| `x2.1` | 遗留项结转（issue 号） |
| `x2.2` | 更新 ADR / MEMORY / 架构规则 |
| `x2.3` | 关闭 program/capability 各 run |

**产出**：`cutover/POSTMORTEM.md`

**门（机器判据）**

- 存在 `cutover/POSTMORTEM.md`（≥200 B）
- `cutover/POSTMORTEM.md` 含小节 `## 遗留项`
- 待决项已关闭或已移交

**只验这一项**（不用整阶段重跑）：`check-phase.mjs --run <run> --phase X2`

**失败处理**：遗留项无 issue 号 → 不许关闭 run。

## 3. 通用规则

1. **门不过不推进**：`advance` 会先跑当前阶段门，红则 `exit 1` 并拒绝。
2. **签字绑定指纹**：签字后产物被改动 → 签字自动失效（`status` 会报）。
3. **门写错就改门**：改 `lib/phases.mjs` 并在 `PROGRAM.md` 记录原门为何不合理；不许用"放宽阈值"让它变绿。
4. **启发式不作门**：行数、正则三态这类只能进报告提示；错判成本由人承担。
