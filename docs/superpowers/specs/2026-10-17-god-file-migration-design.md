# GodFileMigration 技能 — 设计文档

> **状态**：待用户批准（未批准前不写实现代码、不改 `CONSTITUTION.md`）
> **日期**：2026-10-17
> **替代**：`docs/research/migration-source-code-study/` 的现行 8 层流程（CONSTITUTION v1.2）
> **交付物**：`.pi/skills/god-file-migration/`（技能）+ 本目录的重构处置

---

## 1. 背景：旧流程为什么失败

### 1.1 真实故障

`page.tsx` 里出现硬编码跳转 `'/sessions'`。根路由本应透传 pi-web 的判定逻辑（URL query / project 首选项 / 目录校验），AI 没读到那几条分支，于是"合理地"补了一个跳转。类型正确、测试能过、页面能跑——**语义是错的**。

### 1.2 失败链

```text
读（grep + 分段扫描 2796 行，AI 静默漏读）
  → 漏读不会报警，只让报告少一节
分析（单文件视角，AppShell 的一半行为住在 useAgentSession / rpc-manager 里）
  → 报告质量不高，且无法察觉
规格（继承上面的洞）
  → 洞变成"没说清楚"，实现阶段被自由发挥填满
交付（做完才对比 pi-web 页面）
  → 只验"看起来像不像"，验不出"是不是漏了逻辑"
```

### 1.3 旧流程从未真正跑通

`_workflow-validation/v1-findings.md` 声称 ProjectTrustDialog 9 文档 + 复现率 100% + coverage-matrix 12 块已完成，实测**该目录根本不存在**。`CONSTITUTION.md §10` 自述"AI 能否按本宪法 1:1 重写报告——**未验证**"。成本估算 8–12h/god、30–50h 全程，产出 0。

### 1.4 旧流程的成本大头已被工具取代

8 层里有 3 层本质是机械结构提取（L1 静态结构 / L3 状态机枚举 / coverage matrix），全部靠 grep。V1 光修 grep 模式本身就花了 3 个 P1 bug（泛型 `useState<...>` 不匹配、固定缩进、`&&` 短路）。现在有 LSP/AST 可枚举符号全集。

---

### 4.0 证据源分级（取代原 C-drift 阶段）

原设计的 C-drift（重验 capability-boundary-final）**取消**。用户实测发现：pi-web 的 OpenWiki 已有 113 页，其中 `tech-debt/` 31 页**逐个分析了 god 文件**（AppShell / ChatWindow / SessionSidebar / ChatInput / MessageView / FileViewer / useAgentSession / rpc-manager / McpConfig / ModelsConfig），且是**用 LSP 生成并自带校验脚本**（`tech-debt/verify-refs.mjs`，实测 139 链接 + 65 行号 + 66 repo:// 引用全解析）。

因此 `capability-boundary-final.md` **不再是依赖项**，只降级为"假设来源"。证据按可信度排序：

| 级别 | 来源 | 用途 | 可靠性 |
|---|---|---|---|---|
| **E1** | **AST/LSP**（`code_resolve` / `code_find` / `code_graph` / `code_inspect`） | 结构、符号全集、引用/入度、行界 | 最高——机器判定，不漏读 |
| **E2** | **pi-web OpenWiki `tech-debt/` 页** | 业务分析、接缝边界、切分方案、技术债、测试要求 | 高，但**可能过期**（vendored 0.12.2 会升级）→ 必须过 drift 闸门 |
| **E3** | **pi-web OpenWiki `product/` 页** | 产品能力划分、用户旅程、非目标 | 中——描述意图，不描述实现 |
| **E4** | 旧研究文档（`2026-10-12-refactor-migration/*`、`source-code-study/*`） | 仅当 E1/E2 缺失时补充 | 低——grep 时代产物，只当线索 |

**硬规则**：任何进入规格的断言必须标 E1 或 E2 级别；E2 必须在 drift 闸门下新鲜；**E4 不得单独作为证据**。

**capability 划分怎么办**：不再依赖 `capability-boundary-final.md`。先从 OpenWiki `product/epics-*.md` + `product/feature-inventory.md` 取产品视角，再用 E1 的 `code_graph` 把每个 feature 落到具体文件/符号，最后才划 capability——即**用工具重新推导，而不是修补旧表**。

用户补充指出：这份文档是 grep 时代产物，可能大量遗漏。**实测确认，且问题比"遗漏"更严重**——它**没有任何一个可机器校验的锚点**。

以 `agent` capability 为例做抽样对账：

| 检查项 | capability-boundary-final 声称 | pi-web 源码实测 | 结论 |
|---|---|---|---|
| rpc-manager command handler 数 | `25 command handlers`（§2 表格 + §4 注释，2 处） | `grep -oE 'case \"[a-z_-]+\"'` → **27** | ❌ 数字不符 |
| `get_commands` | 无 | 存在于 rpc-manager | ❌ 遗漏候选 |
| `get_last_assistant_text` | 无 | 存在于 rpc-manager | ❌ 遗漏候选 |
| `fork_branch` | 无 | 存在于 rpc-manager | ❌ 遗漏候选 |
| `abort_retry` | UC-AGENT-23 `abort-retry-session` | **pi-web 无此 command** | ⚠ 反向：可能是臆造，或把 SDK 能力误记成 command |
| `cycle_model` | UC-AGENT-14 | **pi-web 无此 command** | ⚠ 同上 |
| `cycle_thinking_level` | UC-AGENT-16 | **pi-web 无此 command** | ⚠ 同上 |

更深的问题：132 个 UC ID 用 kebab-case（`abort-session`），pi-web 用 snake_case（`abort`），**两套命名无映射表**，所以无法机械对账——任何人（包括 agent）都无法回答"这份清单是否完整"。

**结论**：`capability-boundary-final.md` 从「已锁定约束」降级为「**待重验假设**」。它定义的 7 个 capability 划分、端口集合、branded 类型，在重验前不得作为 god 迁移的依据。抽样已经证明至少存在双向错误（既有遗漏，也有臆造）。

### 1.5 capability-boundary-final.md 同样不可信（实测证据）

> **注**：本节问题已确认，但**不再单独安排重验阶段**——处置见 §4.0（取消 C-drift，改用 OpenWiki + AST/LSP 重新推导）。本节保留作为证据。

### 2.1 目标

| # | 目标 | 可判定标准 |
|---|---|---|
| G1 | **漏读可判定** | 源码里每个符号都有归属，未归类数 = 0（机器检查） |
| G2 | **编造可判定** | 规格每条规则都有 pi-web 源码行号证据；无证据规则打回 |
| G3 | **规格期就拦下错误** | 决策表每行都有对应测试用例 ID，测试先红后绿 |
| G4 | **耦合自动带入** | 跨 god 依赖由 `code_graph` + pi-web OpenWiki 自动列出，不靠人记 |
| G5 | **架构可变** | 算法规格与架构无关；重组代码不改测试 |
| G6 | **观感可自动验证** | 布局/样式/操作由 headless 基线覆盖，人工只确认剩余观感 |

### 2.2 非目标

- ❌ 不追求"一次迁移完一个 god"。单 concern 才是交付单元。
- ❌ 不在 pi-web 上跑任何测试（架构已变，跑不通也无意义）。
- ❌ 不追求文档完备主义。文档服务于闸门，不服务于篇幅。
- ❌ 不依赖 `docs/research/capability-boundary-final.md` 做任何判断（它已被实测证伪，见 §1.5；capability 划分改用 OpenWiki `product/` + AST/LSP 重新推导）。

### 2.3 反目标（做到就算失败）

| 反目标 | 为什么算失败 |
|---|---|
| **规格里出现"合理的默认"/"通常"/"应该"** | 这就是编造行为的入口，是 `page.tsx` 事故的原型 |
| **用"我读完了"作为读全性证据** | 无法复核；必须机器可判 |
| **把 pi-web 代码直接搬进 evo-pi** | 违反 Clean Architecture 4 层（ADR 0003）与 import 规则 |
| **人工对比页面成为唯一防线** | 太晚，且只能验表象 |
| **让 god 文档重新长成 mega-doc** | 4296 行的教训；单文件硬上限 400 行 |

---

## 3. 已锁定的约束（来自前序决策，不再讨论）

| ID | 约束 | 来源 |
|---|---|---|
| C1 | 目标架构 = Clean Architecture 4 层（domain / use-cases / adapters / infrastructure）+ web | ADR 0003 |
| C2 | 每个 capability 走 4-PR：**A UI mock → B backend stub → C backend SDK → D 集成 E2E** | capability-boundary-final D11 |
| C3 | JSONL schema **永远 v3 兼容**；evo-pi re-export SDK 类型不复制 | D9 / D12 |
| C4 | 端口隔离：evo-pi **30041**，pi-web **30141**，绝对不触碰 | MEMORY §6.1 |
| C5 | JSONL fixture 直接取 pi-web 真实生成的文件，mock 必须是真实形状 | D11 Q7 |
| ~~C6~~ | ~~能力边界：7 capability~~ → **取消为依赖项**：7 capability 名称降为工作假设；UC 清单 / 端口集合 / branded 类型全部作废重推（§4.0） | capability-boundary-final §2 + §1.5 实测 |
| C7 | SDK 复用率 ≥ 80% 直接 import，零重写 | D7 |
| C8 | pi-web 是 vendored `ref_projects/pi-web`（@agegr/pi-web 0.12.2），会随上游升级 | MEMORY §2.1 |

---

## 4. 核心机制：五个机器可判的闸门

### 4.1 闸门总览

```text
S0 立案 ──► S1 读全 ──► S2 关注点分解 ──► S3 算法规格 ──► S4 规格评审
             G1:未归类符号=0   G2:每 concern 可独立测试   G3:每条规则有证据+测试ID
                                              │                ▲ 用户签字
                                              ▼
                                        S5 TDD 实现（4-PR 模式）
                                              │
                                        S6 交付验证
                                     G4 单元/契约  G5 headless UI
                                     G6 pi-web 行为对照   G7 用户手工确认
```

### 4.2 G1 — 读全性：符号全集 + 强制归属

**替代** 旧 coverage matrix（人工分块、自报覆盖率）。

做法：`code_resolve({ target: { file } })` 拿声明全集，`code_find` AST 模式枚举 import / export / call 名称，得到该文件的**符号宇宙**。每个符号必须被归到某个 concern，或显式标记 `out-of-scope`（附理由）。

> **未归类符号数 > 0 → 闸门不通过。** 这一条直接杀掉"静默漏读"：漏读不再表现为"报告少一节"，而是机器数出来的差额。

产物 `SYMBOL-INVENTORY.md`，机器可检：

| symbol | kind | lines | concern | 证据 |
|---|---|---|---|---|
| useResizablePanel | function | 218-294 | c04-panel-sizing | AppShell.tsx:218 |
| __piTabState | variable | 88 | out-of-scope | vendored-runtime-flag（SDK 语义） |

### 4.3 G2 — 关注点可交付性

一个 concern 是**交付单元**，合格线：

| 判据 | 说明 |
|---|---|
| 可独立写测试 | 存在不依赖其它 concern 的输入输出面 |
| 可独立 review | 规格 ≤ 400 行、改动不牵动其它 concern |
| 单一一句话定义 | 说不出"这个 concern 在干什么"就是切错了 |
| 有明确归属层 | domain / use-cases / adapters / infrastructure / web |

**前后分离**：跨前后端的 concern 拆成 FE-slice 与 BE-slice 两个交付单元，各自用桩数据开发（C2 的 4-PR 模式已经内建桩）。**桩数据的形状必须来自 S3 算法规格，不许现编**——桩编造是第二个编造入口。

### 4.4 G3 — 算法规格：架构中立的决策表（核心）

**这是新范式的重心。** 一个 concern 的规格不是散文，而是一张**决策表**。

| 规则 | 前置条件 | 动作 | 结果 | pi-web 证据 | 测试 ID |
|---|---|---|---|---|---|
| R-1 | `url.search` 含 `session` | 用该 sessionId 恢复 | URL 不变，无跳转 | `AppShell.tsx:312-318` | T-R1 |
| R-2 | 无 `session` 且有 `cwd` | 打开新会话 composer | `?cwd=<abs>`，**hash 为空** | `AppShell.tsx:320-331` | T-R2 |
| R-3 | 无 `session` 无 `cwd` 且 cwd 目录不存在 | **报错** | 显示 `Directory does not exist`，**不得**转去别的 session | `e2e/project-navigation.mjs:104-109` | T-R3 |

硬规则：

- **每条规则必须有 pi-web 源码行号证据**（或 pi-web 自带测试的断言位置）。无证据 → 编造 → 打回。
- **每条规则必须挂一个测试 ID**，且 A 层测试里存在该 ID。挂不上 → 这条规则没被锁住。
- **禁止出现**"合理的默认""通常""应该""视情况"——这是编造行为的语法标记，命中即打回。
- **规格不引用 pi-web 代码路径**，只引用它的**语义**。所以架构重组后测试依然有效（C5/G5）。
- **`S3-N/A (baseline-only)` 例外**：无可枚举输入输出的 concern（纯布局 / 间距 / 视觉层级）允许声明 `S3-N/A`，但必须同时交出 **C 层 headless 基线**，否则不准进 S4。

### 4.4b 偏离记录（deviation record）

big-bang 迁移必然存在"evo-pi 故意不做某个 pi-web 行为"（如 §4.6 G7 的人工门、端口隔离带来的差异）。G3 会把这类偏离当成违规，所以必须有显式出口：

#### 偏离记录（不计入决策表）

| ID | pi-web 行为 | evo-pi 决策 | 理由 | 谁拍的 |
|---|---|---|---|---|
| D-1 | 目录不存在时回退到上次 session | 改为显式报错 | pi-web 自身 e2e 已断言此行为，改动风险高 | 用户 2026-xx-xx |

规则：**偏离必须单独成节，不得混进决策表**（混进去就等于用"决策"掩盖"漏读"）；每条必须有拍板人；偏离多于 3 条的 concern 必须回 S2 重新切分（说明切分错了，不是个例）。

来源可从 pi-web OpenWiki 取（`rpc/wrapper.md`、`sessions/reader.md` 已做过同层提炼），但**标记为二手证据**，关键结论仍需行号复核——我们自己刚在 `docs/agents/openwiki-usage.md` 写过：wiki 过期是常态。

### 4.5 G4/G5 — TDD 与 headless

- **A 层（算法规格测试）**：G3 的每条规则一个用例，跑在 `packages/core/src/<cap>/` 用**新架构**实现。代码重组不改测试。
- **B 层（架构契约测试）**：usecase → port → adapter 接缝正确性。
- **C 层（headless UI）**：Playwright 跑 evo-pi dev server（C4：30041）。断言 DOM 结构 / 可访问性锚点 / 操作序列。基线**采集自 pi-web 一次、冻结为规格素材**，运行时只断言 evo-pi，不依赖 pi-web 跑起来。

### 4.6 G6/G7 — 交付确认

- **G6**：与 pi-web 实际运行页面对照（先 headless 自动比对，人工过剩余观感）。
- **G7**：用户手工验证确认——**这是唯一的最终交付门，不可由 agent 代签**。

### 4.7 附加：规格溯源与漂移检测

每条规格记录 pi-web 源码位置 + vendored 版本（0.12.2）。pi-web 升级后重跑校验：行号失效或断言变化 → 标记该规格 `stale`，必须重审。

这是旧流程完全没有的维度：旧 CONSTITUTION 只说"L1 要重测"，新流程说"**哪几条规格**因升级失效"。

---

## 5. 技能形态与阶段流

### 5.1 目录结构（Pi 技能，`(iii)` 分层）

```text
.pi/skills/god-file-migration/
├── SKILL.md                          ← 编排 + 阶段流 + 闸门定义（目标 ≤ 300 行）
├── references/
│   ├── charter.md                    S0 立案模板
│   ├── symbol-inventory.md           S1 符号清单 + 归属表（G1 判据）
│   ├── concern-index.md              S2 关注点索引 + 可交付性判据
│   ├── algorithm-spec.md             S3 决策表 schema ★核心
│   ├── concern-spec.md               S4 规格包模板（用户签字对象）
│   ├── ui-baseline.md                headless 基线格式
│   ├── gate-report.md                G1–G7 门禁报告格式
│   └── tools.md                      LSP/AST/OpenWiki 工具配方（含已知失效写法）
└── scripts/
    ├── symbol-coverage.sh            G1：未归类符号计数
    ├── rule-evidence.sh              G3：无证据规则检测
    └── spec-drift.sh                 规格溯源 vs vendored 版本
```

技能名必须是 `god-file-migration`（Pi 技能名只允许小写字母/数字/连字符，"GodFileMigration" 作为文档标题与 `/skill:god-file-migration` 调用名）。

### 5.2 阶段流（S-1 → S6）

| 阶段 | 输入 | 产物 | 通过条件 | 失败怎么修 |
|---|---|---|---|---|
| **S-1 取用** | pi-web OpenWiki `tech-debt/<god>.md` | 切分计划草案 | drift 闸门通过（wiki 页未过期） | 跑 `check-drift.mjs`；过期则先重生成 wiki 页 |
| **S0 立案** | god 源码 + 切分计划草案 | `CHARTER.md`：源码指纹、目标 capability、linked gods、预算 | `wc -l` + sha 可复现 | 重测 |
| **S1 读全** | CHARTER + OpenWiki 页 | `SYMBOL-INVENTORY.md` | G1 未归类 = 0（用 E1 工具枚举，不用 grep） | 补归属 |
| **S2 分解** | SYMBOL-INVENTORY | `CONCERN-INDEX.md` | 每个 concern 过 G2 四条 | 重切 |
| **S3 算法规格** | CONCERN-INDEX | `ALGORITHM-SPEC.md` | G3 每条规则有证据 + 测试 ID | 补证据或删规则 |
| **S4 评审** | 三份产物 | 用户签字 | 用户显式批准 | 回 S2/S3 |
| **S5 实现** | 已签规格 | 测试 + 实现 | A/B 层绿；按 C2 走 4-PR | 红了就回规格，**不许改测试迁就实现** |
| **S6 交付** | 实现 | `GATE-REPORT.md` | G4–G7 全绿 | 按门定位 |

### 5.3 与 superpowers 的衔接

| 环节 | 调用 |
|---|---|
| S4 → S5 | `superpowers:writing-plans`（产出实施计划） |
| S5 | `superpowers:executing-plans` 或 `subagent-driven-development` |
| 每个 PR 前 | `superpowers:test-driven-development` |
| 每道门前 | `superpowers:verification-before-completion` |
| S6 前 | `superpowers:requesting-code-review` |

**本技能不自己实现计划与调度**——那是 superpowers 的职责。本技能负责"进到 superpowers 之前，证据链是完整的"。

---

## 6. 现有材料处置表（我的判断，可推翻）

| 现有物 | 行数 | 处置 | 理由 |
|---|---|---|---|
| `CONSTITUTION.md` | 799 | **重写为 v2 并瘦身**，只保留"证据链纪律 + 闸门定义"，历史版本与 changelog 保留在归档节 | 它违反自己的 ≤800 行硬上限，且 §8/§9/§10 各重复一次、§1.1 重号 |
| `_templates/` 11 个模板 | ~2400 | **收敛为 4 个核心 schema**（symbol-inventory / concern-index / algorithm-spec / concern-spec）移入 `references/`；L3/L5/L6/L7 模板降级为可选深挖附录 | 11 模板本身是维护负担；新闸门只需 4 个硬 schema |
| `_skills/` 3 个 skill | 523 | **归档**（文件保留 + banner 指向新技能） | `verify-p1-completeness` 被 G1/G3 机器闸门替代；`extract-design-brief` 被 ALGORITHM-SPEC 替代；`verify-p2-bridge` 被 CONCERN-SPEC + G4 替代 |
| `_workflow-validation/v1-findings.md` | 374 | **保留 + banner** | 它是"旧方法失败"的证据，不删 |
| `2026-10-12-refactor-migration/*.md` 3 篇 | ~10900 | **归档为 v0 事实档案 + banner**，不删不改 | 4297 行 mega-doc 是要避免的反面教材，但里面的事实仍有价值 |
| `docs/research/capability-boundary-final.md` | 690 | **不动**，作为 S0 立案的输入 | 已锁定边界 |

---

## 7. 风险与已知不足

| 风险 | 缓解 |
|---|---|
| **符号全集 ≠ 语义全集**：LSP 能枚举所有函数，但一个函数里的 5 个分支仍可能被漏读 | 靠 G3 的决策表 + 测试强制暴露。**这是残余风险，靠 C 层与 G6 兜** |
| **pi-web 0.12.2 升级 → 规格批量 stale** | `spec-drift.sh` 提前标记，而不是等到实现时才发现 |
| **算法规格写得太细 → 变回 mega-doc** | 单 concern 规格 ≤ 400 行硬上限；只写"会改变外部可观察行为"的规则，纯内部重构不写 |
| **桩数据编造** | 桩的字段集必须能在 S3 决策表里逐条找到出处 |
| **S4 用户评审成为瓶颈** | 每个 concern 独立送审，不攒到最后；一次只审一个 |
| **技能与实际执行脱节**（写了不用） | 技能里的脚本是真能跑的（`scripts/*.sh` 产出真实计数），不是清单 |

---

## 8. 未决项

### 8.1 已回答（2026-10-17）

| # | 问题 | 决议 |
|---|---|---|
| Q1 | 第一个实跑目标 | **AppShell**（2796 行，web 组合层）。所以 S0 模板以 component 型 god 为首要场景，hook 型作为第二档 |
| Q2 | 技能位置 | **项目级** `.pi/skills/god-file-migration/`（随仓走） |
| Q3 | `CONSTITUTION.md` | **归档**。提炼其 KISS/YAGNI 等原则进技能的"反目标"节，其余移入 `docs/research/` 归档，由技能完全接管 |

### 8.2 我替你定了（可推翻）

- 技能名 `god-file-migration`（Pi 硬约束：小写+连字符）
- 四个硬 schema 放 `references/` 而不是 `docs/research/`（单一来源，避免两处模板漂移）
- `page.tsx` 事故作为 G3 的标准反例写进 `algorithm-spec.md` 模板
- 旧流程材料全部**不删**（只加 banner + 归档标记）

### 8.3 已在对话中回答，无需再问

- 判官形状：不跑 pi-web，只提炼架构中立的算法规格
- 测试分层：A 算法规格 / B 架构契约 / C headless UI / D 用户手工
- 技能宽度：`(iii)` 分层（技能编排 + references 模板）
- 交付门：内部测试 + pi-web 页面比对 + 用户手工确认

---

## 9. 批准后的执行顺序

1. ~~回答 §8.1 三个问题~~ → 已回答（见 §8.1）
2. **写技能**（用户明确：先落技能，审核后再做实际验证）
   - `.pi/skills/god-file-migration/SKILL.md`
   - `references/`：证据源分级、切分计划、算法规格（决策表）、偏离记录、headless 基线、门禁清单
   - `scripts/`：锚点校验、规格证据校验、wiki 漂移检测
   - 脚本实跑（语法 + 对真实数据），但**不跑 AppShell 全流程**
3. 重构 `docs/research/migration-source-code-study/`（§6 处置表，CONSTITUTION 归档）
4. 在 MEMORY.md §5.2 + §6 接入索引与纪律
5. **审核通过后**：AppShell 实跑 S0–S1，验证技能不是纸面文档

---

**End of design doc.**
