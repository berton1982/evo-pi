# 状态契约：`state.json` / `PROGRESS.md`

> 目的只有一个：**换 session、换人、隔三天回来，三分钟内接上**。
> 因此状态必须是**事实**（脚本算出来的），不是**回忆**（agent 写的总结）。

## 1. 谁可以写

| 文件 | 写法 | 理由 |
|---|---|---|
| `<run>/state.json` | **只由 `state.mjs` 写** | 手改 = 下一个 session 读到假进展 |
| `<run>/PROGRESS.md` | **只由 `state.mjs status` 生成** | 它是视图，不是源；手改会被下次覆盖 |
| `<run>/*.md` 产物 | agent / 人写 | 这是成果，不是状态 |

## 2. 四个作用域各自独立建档

一次迁移有 4 类 run，**互不污染**：

| 作用域 | 数量 | 建档命令 |
|---|---|---|
| `program` | 1 | `init --scope program` |
| `chassis` | 1 | `init --scope chassis --program <program-run>` |
| `capability` | 每个能力 1 | `init --scope capability --rlevel R2 --program <program-run> --god <path>` |
| `cutover` | 1 | `init --scope cutover --program <program-run>` |

`--program` 不是可选的礼节：它让 `programPrereq` 门能检查"纲领产物真的存在"。
`--rlevel` 决定门的强度（见 `references/design.md §7`）。

## 3. `state.json` 字段

| 字段 | 含义 | 谁维护 |
|---|---|---|
| `schemaVersion` | 格式版本（当前 3） | `init` |
| `scope` | `program` / `chassis` / `capability` / `cutover` | `init` |
| `rLevel` | `R1` / `R2` / `R3`（capability 必填） | `init` |
| `programRun` | 纲领 run 的相对路径 | `init` |
| `gods[]` | `{ path, lines, sha1, symbols, symbolSource }` | `init` / `god` |
| `surfaceCount` | 表面点总数（来自 `surface.json`） | `surface` |
| `godRegistry` | 全景表路径 + 立项时 sha1 | `init` |
| `phase` / `phaseStatus` | 当前阶段 + `in_progress` / `done` | `advance` |
| `phases{}` | 每阶段 `{ startedAt, doneAt }` | `advance` |
| `substeps{}` | `{ C4: { "c4.3": 时间 } }`——续跑的最小粒度 | `step` |
| `artifacts{}` | `{ path: { sha1, bytes, at } }` | `record` |
| `signoffs{}` | `{ path: { sha1, by, at } }` **签字 + 签字时指纹** | `signoff` |
| `decisions[]` | `{ id, text, status: open/closed }` | `decide` |
| `lastCommand` | 最近一次验证命令与退出码 | `command` |
| `closed` | 本 run 是否关闭 | `advance` |

## 4. 子命令

```sh
S=.pi/skills/migrating-god-files/scripts

node $S/state.mjs init --run <dir> --scope program
node $S/state.mjs init --run <dir> --scope capability --rlevel R3 --program <prog-run> --god <path>
#   默认会把 references/templates/ 里该作用域的模板铺到 run 里（顶部带 `TODO-init-scaffold` 横幅），
#   并把 evidence/ gates/ plans/ 等目录建好。不想铺：加 --no-template；想覆盖已存在的手写件：加 --force。
#   横幅还在 = `check-phase` 的 file/heading 直接判红（“仍是 init 铺的模板”）。
#   模板与目标路径的完整对照见下方 §4.1（TEMPLATE_MAP 是唯一事实来源）。

node $S/state.mjs god     --run <dir> --id <basename> --symbols 1241 --source LSP
node $S/state.mjs surface --run <dir> --count 137
node $S/state.mjs step    --run <dir> --id c4.3
node $S/state.mjs record  --run <dir> --artifact CHARTER.md
node $S/state.mjs signoff --run <dir> --artifact design/manifest.json --by user
node $S/state.mjs decide  --run <dir> --id Q1 --text "..."
node $S/state.mjs command --run <dir> --cmd "pnpm test" --exit 0
node $S/state.mjs status  --run <dir>
node $S/state.mjs advance --run <dir>
```

`advance` 会先跑当前阶段门；门红则 `exit 1` 且**拒绝推进**。这是唯一允许的前进方式。

### 4.1 模板对照表（`init` 铺什么到哪）

全部模板都在 `references/templates/`，铺底时由 `scripts/state.mjs` 的 `TEMPLATE_MAP` 决定目标路径；`lint-skill.mjs` 会双向校验"模板被文档引用 + 在 TEMPLATE_MAP 里"，所以这张表不会和代码走散。

| 模板 | 铺到（相对 run） | 作用域 | 哪个门要它 |
|---|---|---|---|
| `PROGRAM.md` | `PROGRAM.md` | program | P0 `program` |
| `ARCHITECTURE.md` | `ARCHITECTURE.md` | program | P2.5 `file`/`heading` + `signoff` |
| `CAPABILITIES.md` | `CAPABILITIES.md` | program | P3 `capabilityPlan` |
| `arch-rules.json` | `arch/rules.json` | program | P2.5 `archRules` / `commMatrix` / `frontendArch` |
| `frontend-arch.md` | `arch/frontend.md` | program | P2.5 `frontendArch` |
| `stubs.md` | `contracts/stubs.md` | program | P1 `stubPlan` / C5 `stub` |
| `chassis-contract.md` | `chassis/CONTRACT.md` | chassis | H0 `file`/`heading` |
| `CHARTER.md` | `CHARTER.md` | capability | C0 `file`/`heading` |
| `ownership.md` | `ownership.md` | capability | C1 `coverage` / `ownershipTypes` |
| `cut-list.md` | `cut-list.md` | capability | C1 `lines`（drop 必须在这里） |
| `behaviors.md` | `behaviors.md` | capability | C3 `behaviors` |
| `design-manifest.json` | `design/manifest.json` | capability | C4 `design`（D1–D18） |
| `components.md` | `design/components.md` | capability | C4 `file`（R2/R3） |
| `ui.md` | `<run>/design/ui.md` | capability | C4 `uiProto` + `humanSignoff` |
| `spec.md` | `<run>/spec.md` | capability | C3 `capSpec` + `humanSignoff` |
| `environment.md` | `<run>/environment.md` | program | P1 `envReady`（端口/变量/构建/版本/夹具） |
| `dynamics.md` | `design/dynamics.md` | capability | C4 `file` + D13/D17 |
| `quality.md` | `design/quality.md` | capability | C4 `file` + D9/D18 |
| `integration.md` | `integration.md` | capability | C5 `integration` |
| `review.md` | `review.md` | capability | C5 `review`（12 项清单 + 度量对账） |
| `acceptance.md` | `acceptance.md` | capability | C6/C7 `acceptance` |
| `cutover-plan.md` | `cutover/PLAN.md` |
| `cutover-rehearsal.md` | `cutover/REHEARSAL.md` | cutover | X0 `file`/`heading` |

规矩：**模板顶部带 `TODO-init-scaffold` 横幅**。`file`/`heading`/`design`/`stub*`/`integration`/`acceptance` 这些吃文件的 kind 见到横幅一律判红——铺底是提醒，不是产出。

## 5. 漂移规则（为什么能信"上次的结论"）

`status` 每次重新计算，下列任一成立就报警：

| 变化 | 后果 |
|---|---|
| god 源码 sha1 / 行数变了 | C0 指纹过期 → 从 C0 重跑 |
| 全景表在立项后被改动 | 切片/邻居结论需复核（run 关闭后不算漂移） |
| 签字产物在签字后被改动 | 签字失效 → 重新送签 |
| 已登记产物被改动 | 提示"登记后被改动"，确认是否 supersede |

**推论**：只要 `status` 不报警，就**可以信任**已 done 阶段的产出、不重读。
这是省 context 的唯一合法依据。

## 6. `PROGRESS.md` 的九个固定小节

1. 现在在哪（作用域/阶段/目标/当前子步骤/下一动作）
2. 阶段阶梯（本作用域的阶段与产出）
3. 本阶段子步骤（勾选列表）
4. 输入与产出 + 指纹 + 表面点数
5. 漂移与风险
6. 待决项
7. 签字
8. 上次命令
9. 新 session 开场（3 分钟）

第 1、5、6、9 节就是续跑需要的全部信息。

## 7. 多 run 协同

```
program (1)  ←── chassis (1) / capability (N) / cutover (1) 通过 --program 引用
```

看全局进度不看对话，看三处：

- 每个 run 的 `PROGRESS.md`（本 run 在哪）
- 纲领 run 的 `CAPABILITIES.md`（能力状态列）
- `.evo/migration/GODS.md`（god 状态列）

**不要**手工汇总一份"总进度.md"——那是第四份真相，必然漂移。

## 8. 接管旧目录

已有的、带产物但没有 `state.json` 的目录可以接管：

```sh
node $S/state.mjs init --run <dir> --scope capability --rlevel R2 --program <prog>
node $S/state.mjs record --run <dir> --artifact CHARTER.md
node $S/state.mjs status --run <dir>
```

不要为了让旧目录"看起来有状态"而手写 `state.json`。
