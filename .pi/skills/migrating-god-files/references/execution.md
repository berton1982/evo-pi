# 执行脊柱：superpowers 挂载 + 任务粒度 + 隔离

> 本技能负责**治理**（状态、门、防遗漏），superpowers 负责**执行**（计划、TDD、审查）。
> 两者不是替代关系。v1 曾在 `stages.md:141` 挂过它们，v2 漏了，这里补回并升级为硬门。

## 1. 挂载表（哪一步用哪个技能）

| 阶段 | 用哪个 | 产物 | 是否硬门 |
|---|---|---|---|
| C3 行为规格 | 本技能（行为清单） | `behaviors.md` | C3 `behaviors` 门 |
| C4 设计 | 本技能（D1–D18） | `design/manifest.json` | C4 `design` 门 |
| C4→C5 之间 | **`superpowers:writing-plans`** | `plans/<cap>.md` | **C4 `plan` 门**（R2/R3） |
| C5 执行 | **`superpowers:executing-plans`** 或 `subagent-driven-development` | 代码 + `gates/C5.json` | **C5 `verification` 门** |
| C5 每个任务 | **`superpowers:test-driven-development`** | 测试先红后绿 | 无机器门（见 §6 局限） |
| C5 开工前 | **`superpowers:using-git-worktrees`** | worktree + 分支 | 无机器门（§4 约定） |
| C5 每个 PR 前 | **`superpowers:requesting-code-review`** | `review.md` | **C5 `review` 门**（R2/R3） |
| 每道门执行前 | **`superpowers:verification-before-completion`** | 命令输出 | `record-verification` 落 JSON |
| 能力收尾 | 本技能 C7 | `retro.md` | C7 门 |

R1 豁免：`plan` / `review` 不要求（单文件设置页写计划与双轴审查的成本高于收益）。

## 2. 任务粒度：`plans/<cap>.md`

`writing-plans` 的产物必须落成**机器可读的表**，否则 `check-trace` 无法做四向追踪：

```markdown
| 任务 | 目的 | 设计元素 | 行为 | 验收命令 | 测试 ID |
|---|---|---|---|---|---|
| T-01 | 拉取会话上下文 | D-U-01, D-P-01 | B-001 | `pnpm vitest run packages/web/src/x.test.ts` | T-01 |
| T-02 | 会话行点击切换 | D-B-01 | B-002, B-003 | `pnpm vitest run packages/web/src/y.test.ts` | T-02 |
| T-03 | 空态与错误态 | D-B-05 | B-010 | `manual: 断网后点刷新` | — |
```

规则：

- 每个任务**必须**关联 ≥1 个设计元素与 ≥1 条行为（否则 `trace` 红）
- 每个设计元素 / 行为**必须**被 ≥1 个任务承载（否则范围静默缩水）
- 验收命令用反引号包住；无法自动化的写 `manual: <步骤>`，**必须**在 `review.md` 里说明怎么验

## 2.1 实施前先观察（C5 `observations` 门）

每个**界面任务**（`plans` 里 `设计元素` 指向 D-/C-/H-/ST- 的行）在动手前要写 `observations/<T-xx>.md`：

```
## 看到什么   ← pi-web 的真实结构：源码 路径:行号，或你在 30141 上看到的是弹窗/分区/列表项/空态…
## 差在哪     ← 我们现在缺什么、差在结构还是差在数据
## 决定       ← 采用什么、为什么不是另一种
```

为什么是门而不是自觉：D-2 里我们对着**可及树 dump** 改代码，把「项目名 + 版本」压进一个读屏名——
字符级比对全绿，人眼一看就不对。那次"看一眼"是我自发的，流程里没有这一步，下一个人就不会看。
已 `done` 的任务不追溯（代码写完了，观察补不出来；逼人补就是造假）。

## 3. 机器证据：`gates/<id>.json`

`gates/*.md` 是人写的叙述，**不作为门判据**。门只认：

```json
{
  "id": "C5",
  "generatedAt": "2026-10-21T10:00:00.000Z",
  "runs": [
    { "cmd": "pnpm test", "exit": 0, "durationMs": 41233, "at": "...", "tail": "..." }
  ]
}
```

生成方式（唯一入口）：

```sh
S=.pi/skills/migrating-god-files/scripts
node $S/record-verification.mjs --run <run> --id C5 --from-plan plans/<cap>.md
node $S/record-verification.mjs --run <run> --id C5 --cmd "pnpm test" --cmd "pnpm lint"
```

判据：**≥1 次运行、全部 exit 0、且不超过 30 天**（X1 用 7 天）。
过期即红——上次绿不能当这次的证据。

## 4. 隔离与并行（E3：先串行）

| 项 | 约定 |
|---|---|
| 并行度 | **同一时刻只推 1 个 capability**（E3）。能力之间靠 `--program` 共享纲领，不共享运行态 |
| worktree | 每个能力一个：`git worktree add ../wt-<cap> -b mig/<cap>` |
| 端口 | 主 30041；若将来开并行，第 N 个用 `30041 + 10*N`；**30141 永不占用** |
| 采集 | 只用离线快照（见 [harness.md](harness.md)），不在测试时连 pi-web |
| 合并 | 一个能力一个分支，`review.md` 关闭后合入；割接前统一打 tag |

为什么要 worktree：`state.json` 与 `PROGRESS.md` 是**单写者**资产；两个能力在同一目录并行会互相覆盖状态。

## 4.5 前后端独立开发 → 联调（历史约定的落地）

约定（`docs/superpowers/specs/2026-10-17-god-file-migration-design.md:165`）：跨前后端的 concern 拆成 **FE-slice** 与 **BE-slice** 两个交付单元，各自用桩数据开发，最后集成。技能把这句话拆成四道门 + 两份文档：

| 阶段 | 你做什么 | 门（红条会告诉你缺什么） |
|---|---|---|
| P1 | 写 `contracts/stubs.md`：契约每条命令/事件对应哪个桩、哪个夹具、状态 | `stubPlan`（漏行 / blocked 无理由 / ready 无文件 全红） |
| C5 起 | 前端只对着**桩 + 夹具**开发；后端拿同一批夹具做契约测 | `stub`（本能力要用的 `api` 表面点逐条核对） |
| C5 末 | 把桩换成真实现，写 `integration.md` | `integration`（真实现路径不存在 / 写"桩" / 没证据 全红） |
| C6/C7 | 写 `acceptance.md` 六层阶梯 | `acceptance`（pre 要 L1–L4；有 api 加 L5；final 要 L6 且人签） |

**桩的形状必须来自规格**（`behaviors.md` 的决策表 + `schema.ts`），不许现编——桩编造和实现编造是同一种病，只是更难发现（因为桩永远"通过"）。

两条线各自的完成判据（写进 `stubs.md` §3）：前端 = 组件测试与行为脚本对桩全绿；后端 = 真实现通过同一批夹具的契约测。**两边都以夹具为准**，不以对方实现为准——这是"独立开发还能集成"的唯一保证。

## 5. 代码审查（你要求的"定期 review"）

每个能力在 C5 结束前必须留下 `review.md`，两条轴都要有结论：

```markdown
# review — <cap>

## Standards

- 是否符合 ADR 0003/0004/0005（层序、端口、类型边界）
- 是否违反 biome 规则、是否有 `as any`/`@ts-ignore`
- 注释卫生：为什么这么写是否讲清（见 docs/conventions/code-comment-hygiene.md）
- 设计模式使用是否与 `design/patterns.md` 一致（被否方案没有偷偷回来）

## Spec

- `behaviors.md` 每条是否有对应对账（C6 会复核）
- `plans/<cap>.md` 的任务是否全部 done，有无静默缩水
- 偏离契约的地方是否有变更单

## 未关闭项

- ❌ <项> → <issue 号 / 修复计划>
```

门判据：文件存在、两个小节存在、**不含 ❌**。有未关闭项就别想过 C5。

## 6. 无法机器化的部分（诚实说明）

| 期望 | 现状 | 缓解 |
|---|---|---|
| "确实先写测试" | 无法从产物证明红→绿顺序 | 任务顺序 + review 抽查 + commit 历史（reviewer 可看） |
| "模式用得对" | D8 只证明模式有**观察到的症状**，不证明实现正确 | review 的 Standards 轴逐条对 `patterns.md` |
| "审查不是走过场" | 门只能要求两个小节存在且无 ❌ | 用户签字 + C7 复盘回看 review 结论是否被后验证伪 |

**不要**把这三项包装成"已机器验证"——那正是上一代技能的病。

## 7. 本轮关闭的应用性缺口（可逐条验证）

| 审查结论（原缺口） | 现在由什么承接 | 怎么验证 |
|---|---|---|
| P0-1 与 superpowers 断链 | §1 挂载表 + C4 `plan` / C5 `review` 硬门 | `check-phase --phase C4` 缺计划即红 |
| P0-2 无任务粒度 | `plans/<cap>.md` + `state.mjs task` 台账 | `check-trace` 报孤儿任务；`state.mjs status` 显示任务进度 |
| P0-3 门禁剧场（人手写 ✅） | `gates/<id>.json` + `record-verification` | 手删 JSON 即红；失败命令 exit≠0 即红 |
| P0-4 工件体量不可维护（1241 符号 / 100 表面点） | `init-symbol-map` 播种 + `claim-surfaces` 批量认领 | 播种幂等、认领后 D2 转绿（selftest 覆盖） |
| P0-5 C6 要连 30141 | [harness.md](harness.md) 离线快照 | C6 只需快照 + 本地命令，`lsof -ti:30141` 只查 |
| P0-6 无 git/worktree/端口策略 | §4 隔离约定（单能力串行、worktree、端口段） | 约定可审；并行度由 E3 决策限制 |
| P1 无代码审查门 | C5 `review` 门（Standards + Spec + 无 ❌） | selftest「REVIEW 有未关闭项 → C5 红」 |
| P1 追踪缺任务层 | `check-trace` 四向追踪 | selftest「TRACE 设计元素无人实现 → 红」 |
| P1 迁移门未进 CI | `.github/workflows/skill-selftest.yml` advisory 步 | CI 日志列出各 run 现状 |
| P1 状态机缺 pause/split | `state.mjs pause/resume/reopen/task` | selftest pause/resume/reopen 断言 |

准确性说明：这些门保证的是**"证据存在且自洽"**，不保证"证据正确"。
人手写的 `review.md`、快照本身的质量、TDD 的红绿顺序，仍然靠人——见 §6。
