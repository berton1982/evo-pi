# 迁移立案区

> 本目录存放**迁移治理资产**：纲领、契约、状态、规格、设计、计划、门证据。
> 它们是**审计材料**，不是临时文件——按 E4 决策**全部入库**（含 evidence/）。

## 目录约定

```
.evo/migration/
├── GODS.md                     # god 全景表（清单封闭的唯一权威）
├── 20261021-<name>/            # program run（一次）
│   ├── PROGRAM.md              # 成功定义 / 不做清单 / 容量假设
│   ├── contracts/              # 6 份外部契约 + schema.ts
│   ├── harness/                # capture/assert 装置 + snapshot/
│   ├── fixtures/               # 真实样本（可复现）
│   ├── ARCHITECTURE.md         # 全局架构
│   ├── arch/                   # layers/communication/states/errors/streaming + rules.json
│   ├── CAPABILITIES.md         # 能力切片
│   └── cutover/PLAN.md         # 割接预案
├── 20261021-chassis/           # chassis run（一次）
│   ├── chassis/{CONTRACT,layout,framework,PARITY}.md
│   ├── state.json              # 只由 state.mjs 写
│   └── PROGRESS.md             # 只由 state.mjs status 生成
└── 20261021-cap-<x>/           # capability run（每能力一个）
    ├── CHARTER.md
    ├── evidence/symbols-*.md   # LSP 导出（大文件，仍入库：它是分母）
    ├── symbol-map.md           # 符号对账表（init-symbol-map 播种）
    ├── ownership.md            # 行区间归属（owner 必须是元素 ID；多 god 用 `## 文件：` 分节）
    ├── cut-list.md             # 砍掉清单（drop 必须有同范围条目 + 理由 + 影响）
    ├── surface.json / surface.md
    ├── readlog.md
    ├── contract-delta.md
    ├── behaviors.md
    ├── specs/                  # R3 决策表
    ├── design/                 # manifest.json + interfaces.ts + 时序 + 策略
    ├── plans/<cap>.md          # writing-plans 产物（任务级）
    ├── gates/C5.json           # record-verification 产物（机器证据）
    ├── review.md               # Standards + Spec 双轴审查
    ├── parity.md               # 行为对账 + 差异分类
    ├── retro.md
    ├── state.json              # 只由 state.mjs 写
    └── PROGRESS.md
```

## 入库政策（E4）

| 类别 | 入库 | 理由 |
|---|---|---|
| `state.json` / `PROGRESS.md` | ✅ | 续跑与签字指纹 |
| 契约 / 架构 / 切片 / 预案 | ✅ | 对外承诺，必须可追溯 |
| `behaviors.md` / `specs/` / `plans/` | ✅ | 交付分母 |
| `design/` | ✅ | 设计可校验 |
| `gates/*.json` | ✅ | **门证据**；不入库则换机不可复核 |
| `evidence/symbols-*.md` | ✅ | 符号分母（1241 行约 300KB/文件，可接受） |
| `surface.json` / `symbol-map.md` | ✅ | 表面与符号分母 |
| `harness/snapshot/` | ✅ | 期望值来源；删了 C6 无法复现 |
| 一次性调试输出、截图大文件 | ❌ | 放 `/tmp` 或 CI artifact |

## 纪律

1. **`state.json` 与 `PROGRESS.md` 只由 `state.mjs` 写**。手改 = 下一个 session 读到假进展。
2. **一个 run 一个写者**。并行请用 worktree（见 `references/execution.md §4`）。
3. **不要手工汇总"总进度.md"**——那是第四份真相，必然漂移。看三处：各 `PROGRESS.md`、`CAPABILITIES.md` 状态列、`GODS.md` 状态列。
4. **门证据必须入库**：`gates/*.json` 是"命令真的跑过"的唯一凭证。

## 快速开始

```sh
S=.pi/skills/migrating-god-files/scripts

# 1) 纲领
node $S/state.mjs init --run .evo/migration/20261021-mig --scope program
# 2) 底盘
node $S/state.mjs init --run .evo/migration/20261021-chassis --scope chassis \
  --program .evo/migration/20261021-mig
# 3) 能力
node $S/state.mjs init --run .evo/migration/20261021-cap-a --scope capability \
  --rlevel R3 --program .evo/migration/20261021-mig --god ref_projects/pi-web/hooks/useAgentSession.ts
```

每一步用 `node $S/state.mjs status --run <dir>` 确认"下一步是什么"。
