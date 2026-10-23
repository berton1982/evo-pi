---
name: migrating-god-files
description: Use when migrating >1000-line god files out of pi-web into evo-pi's Clean Architecture — designing the target (classes, interfaces, protocols, sequence diagrams) and proving nothing was lost; also when resuming such a migration in a new session, after context loss, or handing it to another agent. Symptoms — a split marked complete but parity never verified; a symbol list exported from TypeScript AST instead of LSP; specs written but coverage unclear; a design doc nobody validates; nobody can say which stage the migration is in. Triggers on 迁移 god 文件, 拆分超大文件, 骨架先行, 设计接口与协议, 恢复迁移进度, god file migration, resume migration.
---

# Migrating God Files

把 god 文件迁成**可维护的高质量代码**：先设计，再实现，每步机器可判，任何 session 随时能接上。

技法见 [tooling.md](references/tooling.md)。

## 唯一入口（先跑，再读）

```sh
S=.pi/skills/migrating-god-files/scripts
node $S/state.mjs status --run <run>   # 我在哪 / 下一步 / 什么漂移了
node $S/check-phase.mjs --run <run>   # 当前阶段门过不过
node $S/state.mjs advance --run <run>   # 过门才推进
node $S/design-gate.mjs --run <run>   # 设计门（C4 段自动只跑设计门）
node $S/enumerate-symbols.mjs --file <god> --run <run>   # 符号全集（自己起 tsserver，写 .meta.json）
node $S/state.mjs god --run <run> --id <god> --from-meta   # 由采集证据回填分母（不许手填）
node $S/enumerate-surface.mjs --run <run>              # 表面点（默认只扫本 run 的 god）
node $S/check-symbols.mjs --run <run>                   # 符号级对账（防漏读）
node $S/check-trace.mjs   --run <run>                   # 行为↔设计↔任务↔测试 四向追踪
node $S/check-lines.mjs   --run <run> --mode landed      # 行级交付闭合
node $S/record-verification.mjs --run <run> --id C5 --from-plan plans/<cap>.md
node $S/selftest.mjs                                   # 怀疑工具本身时先跑它
node $S/state.mjs init --run <run> --scope capability --rlevel R2 --program <prog> --god <path>  # 自动铺模板
```

## 四作用域 16 阶段

| 作用域 | 阶段 | 产出 |
|---|---|---|
| **program** | P0 纲领 → P1 契约冻结 → P2 骨架贯通 → P2.5 **全局架构** → P3 切片 → P4 割接预案 | `PROGRAM.md`、6 份契约、`arch/rules.json`、`CAPABILITIES.md` |
| **chassis** | H0 底盘契约 → H1 布局面板 → H2 应用框架 → H3 验收 | `chassis/*` |
| **capability** | C0 立项 → C1 结构对账 → C2 契约对齐 → C3 行为规格 → C4 **能力设计** → C5 实现 → C6 行为对账 → C7 收割 | `behaviors.md`、`design/manifest.json`、`parity.md` |
| **cutover** | X0 预演 → X1 割接 → X2 复盘 | `cutover/*` |

R 级裁剪：`R3` 中枢（全部门 + 时序图 + 渲染预算）、`R2` 复杂界面（设计齐但免时序）、`R1` 独立模块（免签字、免决策表）。

**只认机器证据**：P2 必须有 `gates/P2.json`（真跑过且 exit 0）；P1 harness 只认 `registry.json` 结构。

**布局不属于能力，属于底盘**：zone/面板/持久化/主题/快捷键/通知由 `chassis` 与 `P2.5` 持有，能力只消费。

每阶段的输入 / 子步骤 / 产出 / 门 / 失败处理见 [references/workflow.md](references/workflow.md)（由 `lib/phases.mjs` 生成，不会过期）。

## 设计怎么落地

设计有三处归宿，缺一处就会在每个能力里重拍一次：

| 归宿 | 回答什么 | 产物 |
|---|---|---|
| **P2.5 全局架构** | 组件怎么通信、通知/失效走哪条通道、状态归谁、错误分类、流式唯一入口、层间禁止边；**前端与后端一样要成文**（分层/状态四类/数据获取/三态/props/token/a11y/测试预算） | `ARCHITECTURE.md` + `arch/rules.json` + `arch/frontend.md` |
| **H0 底盘契约** | zone / token / 路由 / 焦点 / 快捷键 / i18n 命名空间 | `chassis/CONTRACT.md` |
| **C4 能力设计** | 分解、类与接口、端口签名、协议、状态归属、时序、模式、质量预算 | `design/manifest.json` + `design/interfaces.ts` |

设计可校验：接口写成 **TS 骨架**（进 tsc），结构写进 **`manifest.json`**（机器读），散文只解释。
D1–D16：决策类（行为↔元素、表面点、状态唯一 owner、端口/协议、时序、无环、三态、模式、预算、与 AD 一致）+ 图纸类（组件树、hook/store、图节点、源码溯源、原则闭集、散文锚点）。没有图纸不算设计。

C4 收尾用 `superpowers:writing-plans` 出 `plans/<cap>.md`，C5 用 `executing-plans` + `test-driven-development`，每 PR 前 `requesting-code-review`。
详见 [design.md](references/design.md)、[execution.md](references/execution.md)。

## 防遗漏：九道串联门

| 漏什么 | 门 |
|---|---|
| god 文件没登记 | P0 `godRegistryClosed`（扫盘对账） |
| 没归入能力 / 归了两个 | P3 `capabilityPlan` |
| 源码中途变了 | C0 `godFingerprint` |
| **符号漏读** | C1 `symbols`（符号全集 ↔ symbol-map：遗漏/过期/虚报 0，drop 必给理由） |
| 行区间没人认领 | C1 `coverage`（每 god 分节）+ `ownershipTypes` |
| **交互点漏实现** | C4 `D2`（表面点必须认领） |
| 行为清单自证 / 脚本孤儿 | C3 `behaviors` |
| 实现与 pi-web 不一致 | C6 `parity`（未分类差异 = 0） |
| **任务与设计脱钩 / 范围静默缩水** | C5 `trace`（行为↔设计↔任务↔测试四向） |
| **某一行没迁也没人知道** | C1/C4/C5 `lines`（行区间闭合 → owner∈manifest → landing 带 `@design`） |
| **门是人手写 ✅** | C5/C6/X1 `verification`（必须真跑命令，落 `gates/*.json`） |
| **桩没摆就开工 / 桩被现编** | P1 `stubPlan`（契约每条命令都有桩+夹具）、C5 `stub`（本能力要用的） |
| **桩从没换成真实现** | C5 `integration`（真实现存在 + 联调证据） |
| **只跑测试不看用户 / L6 代签** | C6/C7 `acceptance`（六层阶梯，L6 必须人签） |
| 收尾没交代 | X1 `programAudit` |

四个分母别混用：**符号**（读全）/ **行**（每行有人管）/ **表面**（入口有主）/ **行为**（做对）；见 [rules.md](references/rules.md) §2。

## 新 session 开场（3 分钟）

1. `state.mjs status`——刷新并打印下一步
2. 读 `PROGRESS.md` 第 1、5、6 节：在哪 / 什么漂移 / 什么待决
3. 只读当前阶段那一节 `workflow.md`；不重读已 done 的产出（除非 `status` 报漂移）

细则见 [references/resume.md](references/resume.md)。

## 五条铁律

1. **先读全景表再动手**——`.evo/migration/GODS.md` 是「谁是 god / 依赖谁 / 什么状态」的唯一权威。
2. **状态只由脚本写**——`state.json` / `PROGRESS.md` 手改 = 下一个 session 读到假进展。
3. **门不过不推进**——要么修产物，要么改门并说明原门为何不合理。
4. **技能不引用运行期产物**——只用 `.evo/migration/<run>/` 占位；实测教训写成规则，不写成"详见某文件"。
5. **签字不代签**——架构、底盘契约、切片、设计、验收由用户签。

## 红线

- ❌ 用 AST 枚举冒充符号全集（差一个数量级，比漏读更危险）
- ❌ 跳过表面枚举直接写行为（覆盖率自证）
- ❌ 把启发式（正则三态、"有 memo"）当硬门（会教出作弊）
- ❌ 在 capability run 里改全局架构（其他能力会与你分叉）
- ❌ 文档里手抄阶段/门清单（必然漂移，用生成器）
- ❌ 一个 session 同时推两个 run

## 索引

| 文件 | 内容 |
|---|---|
| [references/workflow.md](references/workflow.md) | 16 阶段的输入/子步骤/产出/门（生成物） |
| [references/design.md](references/design.md) | 设计归宿、C4 子步、manifest、D1–D16、预算 |
| [references/state.md](references/state.md) | `state.json`、四作用域、子命令、漂移规则 |
| [references/resume.md](references/resume.md) | 新 session 续跑协议、交接、常见误用 |
| [references/rules.md](references/rules.md)、[gates.md](references/gates.md) | 五铁律、AD、四维覆盖率、门目录对账 |
| [references/execution.md](references/execution.md) | superpowers 挂载、计划格式、证据、worktree/端口、双轴审查 |
| [references/harness.md](references/harness.md) | 离线快照采集（不碰 30141）、归一化、manual 兜底 |
| [references/glossary.md](references/glossary.md) | owner 五义、契约两义、证据三义 |
| [references/tooling.md](references/tooling.md) | 脚本清单、零依赖、取舍记录、CI |
| [references/lsp-tooling.md](references/lsp-tooling.md) | `No LSP client` 排障：真因、TS7 坑、能力矩阵、降级 |
| [references/templates/](references/templates/) | 18 份铺底模板，对照表见 [state.md](references/state.md) §4.1 |
