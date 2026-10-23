# 续跑协议：新 session 怎么接上

> 上下文丢失不是异常，是常态。**默认假设：你（agent）什么都不知道**，包括"昨天做到哪"。

## 1. 开场五步（3 分钟，顺序不可换）

```sh
S=.pi/skills/migrating-god-files/scripts
node $S/state.mjs status --run .evo/migration/<run>
```

1. **读 `status` 输出**：作用域 / R 级 / 当前阶段 / 当前子步骤 / 漂移 / 待决项。
2. **读 `PROGRESS.md` 第 1、5、6 节**：在哪 / 有什么风险 / 有什么待决。
3. **只读当前阶段那一节** `references/workflow.md#<阶段id小写>`。
4. **执行第 1 节写着的那个子步骤**，完成后 `state.mjs step --id <子步骤>`。
5. 阶段产物齐了再 `state.mjs advance`（它会跑门）。

不要先通读 references，不要先读所有产物。

## 2. 按作用域决定"该读什么"

| 当前 run 的作用域 | 只读这些 | 不要读 |
|---|---|---|
| `program` | `PROGRAM.md`、`contracts/`、`arch/rules.json` | 任何能力目录 |
| `chassis` | `chassis/CONTRACT.md` + `arch/communication.md` | 能力设计 |
| `capability` | `CHARTER.md`、`behaviors.md`、`design/manifest.json` | 其他能力的产物 |
| `cutover` | `cutover/PLAN.md`、各能力 `parity.md` 汇总 | 设计文档 |

## 3. 什么情况下才回读旧产物

| 情况 | 读什么 | 为什么 |
|---|---|---|
| 要做 C3 行为规格 | C1 的 `surface.json` + `ownership.md` | 行为必须挂在表面点上 |
| 要做 C4 设计 | C3 的 `behaviors.md` + 纲领的 `arch/rules.json` | 设计要满足行为、且不能违反 AD |
| 要做 C5 实现 | `design/manifest.json` + `design/interfaces.ts` | 照着设计写，不是照着感觉写 |
| 要做 C6 对账 | `behaviors.md` + `harness/registry.json` | 分母与脚本都在这里 |
| `status` 报漂移 | 回对应阶段那一步 | 旧结论已作废 |
| 用户问"为什么这么设计" | `design/patterns.md` + 待决项 | 决策链在文件里 |
| 要交接 | `PROGRESS.md` 全文 | 它就是交接文档 |

**不要**为了"熟悉一下"而通读十几份 spec 和上千行 symbol-map——那是把 context 烧在已 done 的事上。

## 4. 判定「上次的结论还能不能信」

唯一依据是漂移检测，不是"看起来没问题"：

- 无漂移 → 信任已 done 阶段，继续推进
- 有漂移 → 从漂移点重跑，**不要**在旧结论上打补丁

漂移规则见 [state.md §5](state.md)。

## 5. 常见误用（都会烧掉一次会话）

| ❌ | 后果 | ✅ |
|---|---|---|
| 上来就 `code_resolve` 整个文件、从头读一遍 | 半小时过去，进度没动 | 先 `status`，只读当前阶段需要的 |
| 跳过表面枚举直接写行为 | 覆盖率自证，D2 会红但那时已返工 | C1 先枚举，C3 再写行为 |
| 手改 `state.json` / `PROGRESS.md`「修正一下状态」 | 下个 session 读到假进展，签字指纹对不上 | 用 `state.mjs`；填不上说明那一步没做 |
| 门红就去改文档措辞 / 补字段 | 门永远绿，行为没变 | 先问"是产物错了还是门错了"，两者都留痕 |
| 同时推两个 run | 状态串味 | 一个 session 一个 run；切换前先 `status` |
| 重做已 done 的阶段"保险起见" | 重复劳动 + 与签字版本分叉 | 有疑虑跑 `check-phase --phase <阶段>` 验，不要重写 |
| 在 capability run 里改全局架构 | 其他能力与你分叉 | 回 program run 改 `arch/rules.json` 并记录 |

## 6. 交接给另一个人 / 另一个 agent

只交四样，不需要口头解释：

1. `PROGRESS.md`（当前状态与下一步）
2. 当前阶段 `workflow.md` 小节
3. 未决项清单（`state.decisions` 里 open 的）
4. 一条命令：`node $S/state.mjs status --run <run>`

对方还要问"我该做什么"，说明 `PROGRESS.md` 第 1 节写得不够具体——去修生成逻辑。

## 7. 会话结束时

```sh
node $S/state.mjs status  --run <run>                        # 刷新 PROGRESS.md
node $S/state.mjs command --run <run> --cmd "<最后一条验证命令>" --exit <码>
```

**写进文件的才算存在**；留在对话里的结论下一个 session 读不到。
