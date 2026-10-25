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

## 已知门缺陷（G-34）

**`fidelity` 门的"逐条点名"与文件预算互相打架**：门要求快照里每个 pi-web 独有元素都在 `parity.md` 里出现，
而 `volume` 给 `parity.md` 的预算是 120 行。C-C 实测：逐条登记 30 条后 `parity.md` 涨到 390 行 → `C5:volume` 红；
删掉又 `C6:fidelity` 红。两条判据不可能同时满足。

成因：`fidelity` 在设计时假设"差异项很少"（C-G 只有 9 条），C-C 采集窗口里有大量"对话正文"被当成元素。

待定方案（二选一，未实施）：
1. 门接受 `> 明细见 evidence/<file>.md`，去那份文件里查名字（文档保持精简，明细可查）；
2. 门只要求"分组 + 计数"，逐条明细交给快照 JSON 自证。

当前处置：**记录在案，先推主任务**；`C-C` 的 `fidelity` 暂时保留为"已人工核对"状态。

## 当前状态板（2026-10-25）

| run | 作用域 | 状态 | 门红数 | 说明 |
|---|---|---|---|---|
| `20261022-mig` | program | 进行中 | **0** | 纲领、契约（wire v0.3 含 RPC 命令层）、架构、能力清单、割接预案全部绿 |
| `20261022-C-G-mcp` | capability R2 | **已收割** | **0** | MCP 设置 2,258 行；L6 人工验收已签；保真 77% |
| `20261024-C-C-chat` | capability R3 | 待签 | 3 | 实现完成、C5 绿；剩 design/manifest 重签 + parity.md 签 |
| `20261024-C-A-runtime` | capability R3 | **暂停（L6 pending）** | 1 | 实现完成（6 模块 / 47 单测 / 30 元素 / 44 行为对账）；`/api/agent` 的 SSE 已通（5 条真 e2e：命令分发、空文本、未知命令、abort 幂等、事件序列），41 条 fixme 待转；L6 需人工签 |
| `20261024-web-recal` | program | 已暂停（历史） | 37 | D-1…D-5 已收口，后续由 C-C 及其后的 web 修复承接 |
| `20261022-C-H-skills` | capability R1 | 已暂停（历史） | 43 | 早期试点，只到 C5 |
| `20261024-C-A-agent` | capability | 已暂停（废弃） | 82 | 重复建错的 run，无引用 |

## 平台级技术差异（不是缺口，是策略不同）

| 差异 | pi-web | evo-pi | 影响 | 何时处理 |
| --- | --- | --- | --- | --- |
| 消息列表渲染 | 按可见窗口懒加载（`attachVisibleRef` / `visibleCount` 分页） | 一次性全量渲染 | 保真快照里"两侧同时存在的消息集合"不同，块级对齐会失败（已退到整段集合比较） | 实现"懒加载/虚拟滚动"能力时；**用户建议试用 `react-virtuoso`**，届时评估与贴尾跟随、锚点滚动、`data-entry-id` 稳定性的相互作用 |
| 设置入口 | AppShell 内弹窗 | 同样用弹窗（已对齐） | — | 已完成 |

> 记录原则：技术实现策略不同但**用户可见行为一致**的，写在这里；造成可见差异的，写进对应 run 的 `parity.md` 缺口组。

## diff 能力的归属（2026-10 核查 pi-web 源码后的结论，暂不实现）

| 位置 | pi-web 证据 | 我们现状 |
|---|---|---|
| 聊天内 inline 并排 diff | `components/MessageView.tsx:1359` `SplitPatchView` → `:1370` `SplitFilesView`（`PairedDiffResult` `:1346` 在工具结果能解析成 unified patch 时渲染） | 已有（`packages/web/src/features/chat/diff/split-diff.tsx`），patch 取自**调用参数**的 `patch` 字段 |
| 右侧面板里的文件 diff | `components/FileViewer.tsx:297` `diffLines` + `:333` `DiffView`，在 `:1790` 以 `mode === 'diff'` 渲染（`:1678` 标题是"对比 HEAD"），属**文件查看器**能力 | **未实现**（右侧文件查看器还没做） |
| 从聊天跳到文件 | `components/MessageView.tsx:197` `onOpenFile?: (filePath, page?) => void` | 未接（缺文件查看器 → 缺跳转目标） |

结论：用户观察到的"diff 在右侧展示"对应的是 **FileViewer 的 diff 模式**（看某个文件的改动），而不是聊天里的 patch 卡片——后者在 pi-web 里确实存在。
两者不是同一件事，C-C 只覆盖前者，等文件查看器（C-F）落地时再补后者与 `onOpenFile` 跳转。
