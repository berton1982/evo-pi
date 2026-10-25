# 工具：自包含脚本 + 复用边界

> **本技能自包含**：所有被引用的脚本都在 `scripts/` 下并有测试（`selftest.mjs`）。
> 上一代技能（未定稿）里的脚本**不再被引用**——需要的能力已迁入并重写，
> 原因见 §4「迁入与取舍记录」。

## 1. 脚本清单（全部自带、全部有测试）

| 脚本 | 作用 | 退出码 |
|---|---|---|
| `state.mjs` | 状态机：四作用域建档 / 子步骤 / 产物 / 签字 / 待决 / 状态 / 推进 | 0 成功；1 门红拒绝推进；2 用法错误 |
| `check-phase.mjs` | 阶段门校验（可与 advance 分离抽检） | 0 全过；1 未过；2 用法错误 |
| `design-gate.mjs` | 设计门 D1–D16（含组件树/hook/store/图/溯源/原则/散文锚点）+ 质量预算 + 漂移反查；`--design-only` 用于 C4 | 同上 |
| `enumerate-symbols.mjs` | 导出单文件符号全集：默认自己起 **tsserver**（`--mode ts`）写 `evidence/symbols-<god>.md` + 同名 `.meta.json`（mode/tsserverPath/tsVersion/project/count）；`--mode program` 是降级；`--compare <旧 md>` 比漂移 | 0 成功；1 漂移；2 参数错；3 找不到 tsserver/typescript |
| `extract-conventions.mjs` | 从 `packages/<pkg>/src` 提取分层事实（层/目录/文件数/样例）写 `arch/conventions.json`；P2.5 的 `conventions` 门拿它核对 AD 与 `layerPaths`（规则必须来自仓库，不许想象） | 0 成功；2 参数错 |
| `enumerate-surface.mjs` | 从参考实现枚举可交互表面点（覆盖率外部分母）：`handler:*`/`aria`/`role`/`command`/`event`/`api`（含 `method + path`）/`url`/`i18n`/`hotkey`；默认范围 = 本 run 的 god 文件；`--check` 报漂移 | 0 成功；1 漂移；2 用法错误 |
| `check-symbols.mjs` | **符号级对账**：符号全集 ↔ `symbol-map.md`（遗漏/过期/虚报/drop 无理由） | 0 平；1 有缺口；2 用法错误 |
| `check-lines.mjs` | **行级交付闭合**：structure/bind/landed 三档（见 design.md §行级三个闭环） | 0 该档全绿；1 有缺口；2 用法错误 |
| `check-trace.mjs` | **四向追踪**：行为 ↔ 设计元素 ↔ 任务 ↔ 测试 ID | 同上 |
| `record-verification.mjs` | **机器证据**：真跑验收命令，落 `gates/<id>.json`（门只读它） | 0 全绿；1 有命令失败；2 用法错误 |
| `init-symbol-map.mjs` | 从符号全集**播种** 1241 行 `symbol-map.md`（幂等，保留人工填写） | 0 已写入；1 无可播种；2 用法错误 |
| `claim-surfaces.mjs` | **批量认领**表面点（`--kind` / `--file` / `--id` / `--exclude --reason`） | 0 成功；1 无匹配；2 用法错误 |
| `check-volume.mjs` | 工件体量预算（判断型 ≤400 行 / 数据 ≤5000 行） | 0 合规；1 超限；2 用法错误 |
| `check-gates-map.mjs` | **门目录对账**：阶段引用的 kind 都有实现（无幻影门）、实现的 kind 都被引用（无死门）、`references/gates.md` 与本文件一致 | 0 一致；1 有漂移（`--write` 重生成表） |
| `check-specs.mjs` | **规格校验**：决策表证据锚点可解析 + 禁词 + 测试 ID 落地 | 同上 |
| `check-contracts.mjs` | **契约覆盖**：源码端点（`method + path`，来自表面枚举的 `api` 点）/命令/事件 ⊆ 冻结契约；DTO 字段 ⊆ zod schema | 同上 |
| `check-openwiki-drift.mjs` | **E2 证据时效**：页面 verified 时间 vs 引用源码 mtime | 0 FRESH；1 STALE；2 用法错误 |
| `gen-workflow-doc.mjs` | 从 `lib/phases.mjs` 生成 `references/workflow.md`；`--check` 校验过期 | 0 一致；1 过期；2 用法错误 |
| `lint-skill.mjs` | 技能自检：frontmatter / 体积 / 死链 / 运行期产物引用 / 文档与阶段契约一致 / 零外部依赖 | 0 通过；1 有错误；2 用法错误 |
| `selftest.mjs` | 上面全部的自测：四作用域真实链路 + 设计门负例 + 迁入脚本正负例 + 误用保护 | 0 全过；1 有失败 |
| `selftest-delivery.mjs` | 交付链判据单测：桩漏行 / blocked 无理由 / ready 无夹具 / 真实现写"桩" / L6 由 agent 代签 / 缺 L5 | 0 全过；1 有失败 |

单一事实来源：

- `lib/phases.mjs` — 作用域、16 阶段、子步骤、门、R 级裁剪
- `lib/design.mjs` — D1–D16 / 绑定 / 质量 / 漂移判据
- `lib/parity.mjs` — 符号级对账
- `lib/ownership.mjs` — 行区间覆盖（多 god 分节）/ 归属类型
- `lib/specs.mjs` — 决策表证据 / 测试 ID
- `lib/contracts.mjs` — 契约覆盖 / schema 覆盖
- `lib/checks.mjs` — 门的执行器（不含判据定义）
- `lib/tables.mjs` — markdown 表格 → 数据
- `lib/delivery.mjs` — 桩清单 / 本能力桩就绪 / 联调替换 / 验收阶梯六层（前后端独立开发的判据）
- `lib/frontend.mjs` — 前端约定八节 + `arch/rules.json#frontend`（P2.5 `frontendArch`）
- `lib/observe.mjs` — 实施前的观察门（`observations/<T-xx>.md`：看到什么/差在哪/决定，C5）
- `lib/fidelity.mjs` — 保真快照对账（pi-web 独有的可及元素必须登记，C6 `fidelity`）
- `lib/webscaffold.mjs` — web 切片骨架与落点（C5 `webScaffold`）
- `lib/capspec.mjs` — 能力规格与 ASCII 原型门（用户故事 / 多文件多行区间 / 交互形态 / 布局映射 / 原型块）
- `lib/external.mjs` — 沿 import 追外部 IO（god 自己不写 `fetch` 时的契约分母，C2 `externalIo`）
- `lib/conventions.mjs` — 从 `packages/<pkg>/src` 提取分层事实（`arch/conventions.json`），P2.5 `conventions` 门用它核对 AD 与 `layerPaths`
- `lib/placement.mjs` — 落点判定（plan=路径形态；landed=文件存在 + 客户端不许 `node:*` / core 源码路径），C4/C5 `placement` 门
- `lib/reviewkit.mjs` — 评审的可核对部分：量行数/状态数/副作用数/嵌套/`any`，与 12 项清单对账（C5 `review` 门）
- `lib/verify.mjs` — `gates/<id>.json` 的写入（真跑命令）与判定（全 exit 0 + ≤30 天）
- `lib/trace.mjs` — 任务↔设计元素↔行为↔测试 ID 四向闭合
- `lib/volume.mjs` — 判断型/数据型工件的行数预算
- `lib/provenance.mjs` — 分母同源：产出侧记账（sha + 条数）、判据侧复算；`denominator` 门用它
- `lib/changes.mjs` — 变更传播单：砍单/改契约时的 10 个视图清单，`changePropagation` 门用它
- `lib/envdoc.mjs` — 环境矩阵判据（端口/变量/构建/版本/夹具），`envReady` 门用它
- `lib/gatemeta.mjs` — 每个 kind 的「能抓 / 抓不到」与反向用例索引（`gates.md` 的三层视图由它渲染）
- `lib/lines.mjs` — 行区间三档闭合（structure / bind / landed）
- `lib/tsclient.mjs` — 自己起 tsserver 的客户端（`resolveTsserver` / `projectInfo` / `navTree` / `flattenNavTree`），符号全集的采集侧
- `lib/store.mjs` — `state.json` 读写与目录约定（单写者资产）
- `lib/gatecli.mjs` — 门 kind → 手工自检命令（`workflow.md` 的"只验这一项"由它派生）
- `lib/templates.mjs` — **模板唯一事实来源**：`TEMPLATE_BY_PHASE`（阶段→模板→目标路径），`init` 铺底与 `workflow.md` 的模板行都从它派生

**改门 = 改 `lib/*.mjs`**，然后跑三件套：

```sh
node scripts/gen-workflow-doc.mjs     # 文档跟着变
node scripts/lint-skill.mjs           # 结构自检
node scripts/selftest.mjs             # 门还拦得住东西吗
node scripts/selftest-delivery.mjs    # 桩/联调/验收的判据还咬人吗
```

## 2. 零依赖

技能脚本只允许 `node:` 内置模块（`lint-skill.mjs` 强制）。理由：迁移可能在裸环境执行，
装依赖失败不能让"防漏检"失效。因此架构规则用 `arch/rules.json` 而不是 YAML
（没有 YAML 解析器；JSON 可直接 `JSON.parse`）。

## 3. 与技法文档的关系（只借知识，不借脚本）

以下**文档**仍可作为知识参考（不含可执行依赖）：

| 需要什么 | 参考 | 用在哪 |
|---|---|---|
| LSP 工具能力与陷阱 | `god-file-migration/references/lsp-tooling.md` | C1 导出符号全集 |
| 设计模式目录 | `god-file-migration/references/design-patterns.md` | C4 c4.6 选型参考 |
| UI 基线锚点写法 | `god-file-migration/references/ui-baseline.md` | C6 / H3 断点与锚点设计 |

> 注意：那套文档自身也可能过期（它未定稿）。**以源码与本文档的门为准**；
> 引用它们的结论前先看是否与 `arch/rules.json`、`lib/phases.mjs` 冲突。

## 4. 迁入与取舍记录

上一代技能的脚本逐个处置（这就是"不引用外部脚本"的落地）：

| 原脚本 | 处置 | 落在哪 | 理由 |
|---|---|---|---|
| `check-parity.mjs` | **迁入并重写** | `check-symbols.mjs` + `lib/parity.mjs` | 符号级对账是防遗漏的核心；原实现与 `lib/scope.mjs` 耦合，重写为表格驱动 |
| `check-spec.mjs` | **迁入并合并** | `check-specs.mjs` + `lib/specs.mjs` | 证据锚点与测试 ID 是同一张决策表的两列，分两个脚本会产生两次"部分通过" |
| `check-coverage.mjs` | **合并进上一条** | 同上（`SPEC2`） | 同上 |
| `extract-contract.mjs` | **不迁** | 由 `enumerate-surface` + `check-contracts` 替代 | 生成与校验若同源，错了会一起错；改成分母来自独立扫描 |

## 符号全集为什么自带导出器

> LSP 起不来的排障（含本仓 TypeScript 7 没有 `tsserver.js` 这个真因）见 [lsp-tooling.md](lsp-tooling.md) §1.2。
> **先修 LSP，再考虑离线导出**——`code_resolve` 导出的符号全集才是权威分母。

本仓库的 LSP 客户端**不会自动**服务 `ref_projects/`（该目录 gitignored，而自动工作会应用 
.gitignore 规则），但**显式文件请求可用**。所以正常做法是：LSP 路由正常时用 `code_resolve` 导出；
路由不可用时用 `enumerate-symbols.mjs --mode ts` 自己起 tsserver 导出（实测 `SkillsConfig.tsx` 450 条，
`code_resolve` 390 条，两者都比 `--mode program` 的 175 条接近真相）。

无论用哪条路，**采集证据必须落盘**：`symbols-<god>.meta.json` 记录 `mode` 与 `count`，
C1 的 `lspSource` 门读它并与 `state.json` 对账。`state.mjs god --from-meta` 就是从这份证据回填；
手写 `--source LSP --symbols N` 不再能骗过门。
| `check-contract.mjs` | **迁入并重写** | `check-contracts.mjs`（`CONTRACT1`） | 保留"源码命令/事件必须全在契约里"的判据 |
| `check-schema.mjs` | **迁入并重写** | `check-contracts.mjs`（`CONTRACT2`） | 契约 DTO 字段 ↔ zod schema 键 |
| `check-drift.mjs` | **迁入并重写** | `check-openwiki-drift.mjs` | 判据保留（verified 时间 vs mtime），实现去掉 git 依赖 |
| `verify-cuts.mjs` | **不迁** | 由 `ownership.md`（行区间）+ `surface.json`（表面点）替代 | 接缝组是"机器用的中间产物"，两个更强的分母已经覆盖 |
| `verify-skeleton.mjs` | **不迁** | 由 D6（层序）+ `quality`（行数）+ D7（三态）替代 | 原脚本自认多项是启发式；把启发式当门会教出作弊 |
| `verify-migration-plan.mjs` | **不迁** | 由 P0 `godRegistryClosed` + `godFacts` + P3 `capabilityPlan` 替代 | 清单封闭与能力归属已拆成两个可判门 |
| `verify-features.mjs` / `build-feature-index.mjs` / `extract-features.mjs` | **不迁** | 由 `behaviors.md` + `parity.md` + `capabilityPlan` 替代 | 交付单元从"文件"改为"能力"，索引由 CAPABILITIES.md 承担 |
| `scaffold-docs.mjs` / `init-migration.mjs` | **不迁** | 由 `state.mjs init` + `init-symbol-map.mjs` + `references/templates/` 替代 | 只播种真正需要批量的数据表，不生成一堆空文件 |
| `check-anchors.mjs` | **迁入判据** | `lib/specs.mjs` 的锚点解析 | 只保留"锚点必须可解析"，并对未知参数返回 `exit 2` |

## 5. 已知不可信项（历史经验，仍然有效）

| 现象 | 正确做法 |
|---|---|
| 覆盖率只报一个百分比 | 先问**分子分母各是什么**（符号 / 行 / 表面 / 行为四维，见 `rules.md §2`） |
| 校验脚本对未知参数返回 0 | 误用即静默成功＝关掉了门；本技能所有脚本未知参数一律 `exit 2` |
| 启发式被写成硬门 | 只有能证伪的才进门；启发式进报告提示 |
| 符号全集来自 TS AST | 差约一个数量级；必须 LSP 导出，见 C1 `lspSource` |

## 5.1 门目录（`references/gates.md`）

概念门（`rules.md` 的 32 道）→ 阶段门（`phases.mjs` 的 `checks[].kind`，57 个）→ 实现（`checks.mjs` 的 `case`）三者关系由 `check-gates-map.mjs` 校验，kind 表由它生成。新增 kind 必须同时在 `checks.mjs` 加 `case`、在 `phases.mjs` 引用、在 `check-gates-map.mjs` 的 `DESCRIPTIONS` 登记人话、在 `lib/gatemeta.mjs` 的 `GATE_META` 写清「能抓 / 抓不到」——漏一个就红。

三层视图（`references/gates.md` 的 kind 表）：**存在性**（最容易被铺底/占位骗过）、**结构**（可复算：闭合、一致、sha、条数）、**语义**（机器判不了，必须 `humanSignoff`）。反向用例索引在 `GATE_META` 的 `NEGATIVE_TESTS`：表里的标签必须能在 `selftest.mjs` 搜到，覆盖率低于 20% 直接判红——**门写对了但没人喂过坏数据，等于没验过门**。

## 6. CI

`.github/workflows/skill-selftest.yml`：

```sh
node .pi/skills/migrating-god-files/scripts/selftest.mjs
node .pi/skills/migrating-god-files/scripts/selftest-delivery.mjs
node .pi/skills/migrating-god-files/scripts/lint-skill.mjs
node .pi/skills/migrating-god-files/scripts/gen-workflow-doc.mjs --check
# 有 run 目录时（advisory，直到 P0 完成）
for d in .evo/migration/*/state.json; do node .pi/skills/migrating-god-files/scripts/check-phase.mjs --run "$(dirname "$d")" --all || true; done
```

## 7. 什么时候不再需要本技能

- 文件 < 1000 行且单一关注点 → 直接改，不立项
- 只是查代码/查行为 → 用 wiki 检索或直接读源码
- 一次性小重构 → 不需要 16 个阶段

## 读门输出的正确姿势

判断"还剩几个门"时，**不要 `grep` 门名或 `门通过`**：`check-phase` 的输出是多行，grep 会漏掉你没想起来的关键词，于是得出"只剩一个红"的错误结论（试点里真的这么错过一次，报给用户之后才发现还红着 `quality` 与 `drift`）。

正确做法二选一：

```bash
# 1) 直接看全量（红的最好在最后一行汇总）
node .pi/skills/migrating-god-files/scripts/check-phase.mjs --run <run> --phase C5

# 2) 机器判据：数 ok:false
node .pi/skills/migrating-god-files/scripts/check-phase.mjs --run <run> --phase C5 --json \
  | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const r=JSON.parse(s);const bad=(r.results||[]).filter(x=>!x.ok);console.log(bad.length,'red');for(const b of bad)console.log(' -',b.detail)})"
```
