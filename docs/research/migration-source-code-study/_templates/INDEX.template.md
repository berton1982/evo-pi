# INDEX.template — per-god 导航模板

> **每个 god 子文件夹 (e.g. `app-shell/`) 的 `INDEX.md` 必须按此模板撰写**
> **v1.2 修订**: 加 §6 Design Quality Scorecard + §7 Linked god
> **使用方式**: `cp _templates/INDEX.template.md <god>/INDEX.md` 后填实

```markdown
## <God 名> 源码研究索引

> **写于**: <YYYY-MM-DD>
> **源文件**: `ref_projects/pi-web/components/<File>.tsx` (<line count> 行, <function count> 函数)
> **本研究版本**: v<N> (源文件每次变化 → bump 版本)
> **本 INDEX 适用模式**: 快速扫读 (5-10 min) / 标准深读 (30-60 min) / 完整审计 (2-4 h)
---

## 0. 一句话定位

<用 1-2 句话说明这个 god 在系统中的角色和为什么是 god>
---

## 1. 阅读模式 (必读)

### 1.1 Quick scan (5-10 分钟) — 入门

**目标**: 知道这个 god 在做什么,以及它为什么是 god

**必读**:
1. 本 INDEX (含 §2-§4)
2. `static/file-metadata.md` (L1)
3. `concerns/c<最核心 concern 编号>.md` (L2 中最关键的 1-2 个)
4. `cross-cutting/l7-implicit-invariants.md` (L7,看前 10 条不变量)

**可跳**: L3 状态机细节、L4 数据流完整表、L5 副作用全清单、L6 反模式全表

### 1.2 Standard dive (30-60 分钟) — 准备改这个 god

**目标**: 能在心里画出 god 的内部结构,知道改某处会牵动什么

**必读**:
1. 全部 Quick scan 必读项
2. `concerns/` 目录下**所有** c*.md (L2)
3. `state-machines/` 目录下**所有** sm-*.md (L3)
4. `cross-cutting/l4-data-flow.md` (L4)
5. `cross-cutting/l5-side-effects.md` (L5)
6. `cross-cutting/l6-anti-patterns.md` (L6)
7. `cross-cutting/l7-implicit-invariants.md` 全部 (L7)
8. `cross-cutting/l8-tech-debt.md` (L8, v1.2 新增)

**可跳**: 各 concern doc 内的"V-* 验证清单"具体命令 (执行时再看)

### 1.3 Full audit (2-4 小时) — 重构设计前

**目标**: 100% 覆盖 L1-L8 全部,无遗漏

**必读**:
1. Standard dive 全部
2. 全部 V-* 验证命令**实际执行一次**
3. 跑 `coverage-matrix.md` §2 覆盖率检查
4. 跑 `verify-p1-completeness` skill
---

## 2. 关注点 (Concern) 索引

| c# | 名称 | 文件 | 起始行 | state 数 | handler 数 | 外部依赖 |
|---|---|---|---|---|---|---|
| c01 | <name> | `concerns/c01-<slug>.md` | L<start>-L<end> | n | m | <lib/hook> |
| c02 | ... | | | | | |

**稳定性规则**: c 编号一旦定下不重排
---

## 3. 状态机索引 (L3)

| sm 名 | 起始行 | 文档 | 重要程度 |
|---|---|---|---|
| <stateName> | L<line> | `state-machines/sm-<name>.md` | 🔴 高 / 🟡 中 / 🟢 低 |
---

## 4. 跨切主题索引 (L4-L8)

| 层 | 主题 | 文件 | 摘要 |
|---|---|---|---|
| L4 | 数据流 | `cross-cutting/l4-data-flow.md` | <一句话> |
| L5 | 副作用 | `cross-cutting/l5-side-effects.md` | <一句话> |
| L6 | 反模式 | `cross-cutting/l6-anti-patterns.md` | <一句话> |
| L7 | 隐式不变量 | `cross-cutting/l7-implicit-invariants.md` | <一句话> |
| **L8** | **技术债务** (v1.2) | `cross-cutting/l8-tech-debt.md` | <一句话> |
---

## 5. 验证状态 (KPI)

| 指标 | 目标 | 当前 | 状态 |
|---|---|---|---|
| 事实点总数 (N1) | - | <num> | - |
| V-* 验证命令数 (N2) | - | <num> | - |
| 复现率 (N2/N1) | ≥ 0.8 | <ratio> | ✅ / ⚠ / ❌ |
| coverage-matrix 覆盖率 | 100% | <ratio> | ✅ / ⚠ / ❌ |
| 最后一次重跑 | - | <YYYY-MM-DD> | - |
---

## 6. Design Quality Scorecard (v1.2 新增)

> **每 god 必填**,统一位置便于跨 god 对比。详见 CONSTITUTION §9.4。

| 维度 | 状态 | 备注 |
|---|---|---|
| **SRP** (单一职责) | ✅/⚠/❌ | 多少 concern,每个 1 句话能说清? |
| **OCP** (开放-封闭) | ✅/⚠/❌ | 新 concern 是否需要改现有? |
| **LSP** (里氏替换) | ✅/⚠/❌ | 子组件可被替代? |
| **ISP** (接口隔离) | ✅/⚠/❌ | 不变量责任是否分散? |
| **DIP** (依赖倒置) | ✅/⚠/❌ | 子组件依赖 prop? |
| **KISS** | ✅/⚠/❌ | 过度设计痕迹? |
| **DRY** | ✅/⚠/❌ | 重复 key / 重复规则? |
| **YAGNI** | ✅/⚠/❌ | 预拆 / 预引? |
| **Container/Presentational** | ✅/⚠/❌ | 容器 vs 叶子清晰? |
| **State Machine** | ✅/⚠/❌ | 复杂状态显式建模? |
| **Deep Module** | ✅/⚠/❌ | hook 接口小 + 实现深? |
| **God 反模式** (< 2000 LOC) | ✅/⚠/❌ | 行数: <num> |

**总评分**: <num> ✅ / 12 = <pct>%

**关键失分项** (≤ 2 条):
1. <失分项 1 + 改进方向>
2. <失分项 2 + 改进方向>
---

## 7. Linked god (跨 god 依赖) (v1.2 新增)

> **本 god 不是孤岛**——它依赖/被依赖其它 god。

| 依赖 god | 文件 | 行数 | 类型 | P1 状态 |
|---|---|---|---|---|
| `<god-name>` | `hooks/<file>.ts` | <N> | hook god / component god | ✅ 已 P1 / ⚠ 未 P1 |
| `<god-name>` | `<path>` | <N> | 普通 hook / lib | ✅ 已读 / ⚠ 未读 |

**反向依赖** (本 god 被谁用):
- <god> 在 c<N> 中调本 god 的 <export>
- <god> 在 c<N> 中调本 god 的 <export>

**跨 god 假设** (来自 L7):
- 详见 `cross-cutting/l7-implicit-invariants.md` §"跨 god 假设" subsection
---

## 8. 与 P1.5 / P2 / P3 桥接

### 8.1 P1.5 必读本文档

P1.5 (Design Brief) 撰写时必读:
- [ ] `cross-cutting/l7-implicit-invariants.md` — 不变量映射
- [ ] `cross-cutting/l6-anti-patterns.md` — 重构需消除的反模式
- [ ] `cross-cutting/l8-tech-debt.md` — 改进建议 (v1.2 新增)
- [ ] `concerns/` 全部 — 业务关注点清单

### 8.2 P2 必读本文档

P2 (设计 spec) 撰写时:
- 每个 task 头必带 "Reads from" 引用本文档
- 每个 task 的 "Test must cover" 必带本文档中的不变量 I-N / 假设 A-N

### 8.3 P3 必读本文档

P3 (实施 plan) 撰写时:
- 每个 task 头必带 "Reads from" 引用本文档
- 每个 task 的 "Test must cover" 必带本文档中的不变量 I-N / 假设 A-N
- 每个 task 的 "消除" 必带 L6 §4 对照表条目
- 每个 task 的 "改进" 必带 L8 §3 对照表条目 (v1.2 新增)
---

## 9. 跨引用 (back-link)

### 9.1 本 god 文档依赖

- `static/file-metadata.md` (L1) ← 被所有 L2-L8 引用
- `concerns/c01...cNN.md` (L2) ← 被 L3/L4/L5/L6/L7/L8 引用
- `cross-cutting/l4-l8.md` ← 被 P1.5/P2 spec 引用

### 9.2 本 god 被谁引用

- P1.5 spec: <path>
- P2 spec: <path>
- P3 plan: <path>
- 其它 god: <如果有跨引用,列出来>
---

## 10. 历史与版本

| 版本 | 日期 | 变更 |
|---|---|---|
| v1 | <date> | 初版,基于 god 源码 v<x> |
| v2 | <date> | <变更描述> |
```

---

## 模板要点 (v1.2 修订)

- **§1 阅读模式是 INDEX 的灵魂**——不写 = 不合格 INDEX
- **§2 concern 索引的稳定性**比完整性更重要
- **§5 验证状态 + coverage** 是 P1 质量的"硬证据"
- **§6 Scorecard (v1.2)** 统一术语 + 跨 god 对比
- **§7 Linked god (v1.2)** 解决 god 互相依赖的盲点
- **§8 P1.5 / P2 / P3 桥接**让 P1 不只是研究文档,而是**输入契约**
