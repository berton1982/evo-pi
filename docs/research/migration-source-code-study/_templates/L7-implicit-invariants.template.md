# L7-implicit-invariants.template — 隐式不变量模板 (新增重点)

> **何时用**: L1-L6 全部完成后,**最后**做
> **产出大小**: 300-500 行 (密集表格)
> **依赖**: L1 (state 列表) + L2 (concerns) + L3 (状态机) + L4 (数据流) + L5 (副作用) + L6 (反模式)
> **被谁用**: **P2 设计 spec 的"不变量映射"章节** + **P3 实施 plan 的"Test must cover"**
> **v1.2 修订**: 加 "跨 god 假设" subsection (解决 ChatWindow → useAgentSession 类问题)

```markdown
## L7 隐式不变量 — <God 名>

> **写于**: <YYYY-MM-DD>
> **god**: <god 名>
> **本文档核心问题**: 这段代码在保护什么不变量?哪些是"作者没意识到但在保护"的?
> **重要性**: ⭐⭐⭐⭐⭐ — 重构设计的本质是"在不破坏以下不变量前提下重组 L1-L6"
---

## 0. 与 L1-L6 的区别

| 层 | 描述什么 | 例 |
|---|---|---|
| L1-L6 | 代码**做了什么** | "1 useState, 4 useRef" / "fetch in L142" |
| **L7** | 代码**在保护什么** | **"loading 状态下 escape 不能关闭 dialog"** / **"fetch 必须在 unmount 时取消"** |
---

## 1. 不变量 (Invariants)

> **格式**: `I-N: <一句不变量>` + `<违反时的可见症状>`

| ID | 不变量 | 违反症状 | 涉及 concern | 状态机 |
|---|---|---|---|---|
| **I-1** | <e.g. 切换 session 时,`sessionKey` 必须 bump> | ChatWindow 状态残留 | c04, c05, c19 | sm-sessionKey |
| **I-2** | ... | | | |
| ... | | | | |

**每条详述** (top-5 关键不变量展开):

### I-1: <不变量描述>

- **保护位置**: L<line> (e.g. handleSelectSession)
- **保护机制**: <e.g. setSessionKey(k => k + 1)>
- **违反症状**: <e.g. ChatWindow 不 remount,显示旧 session 的 messages>
- **关联测试**: <e.g. e2e: 切 session 后,chat 内容必须新 session>
- **P2 责任分配**: <e.g. useSessionStore.bumpSessionKey() 集中>

### I-2: ...
---

## 2. 副作用契约 (Side-effect Contracts)

> **格式**: `C-N: <资源/IO> + <前置/后置条件>`

| ID | 资源/IO | 契约 | 涉及 concern | 触发位置 |
|---|---|---|---|---|
| **C-1** | <资源/IO> | mount 时读,drag commit 时写 | c01 | L<line> |
| **C-2** | ... | | | |
| ... | | | | |

**每条详述** (top-5 关键契约):

### C-1: ...
---

## 3. 隐式假设 (Implicit Assumptions)

> **格式**: `A-N: <代码默认但没明说的假设>` + `<如果违反会怎样>`

| ID | 假设 | 违反症状 | 涉及 concern | e2e 覆盖 |
|---|---|---|---|---|
| **A-1** | <代码默认但没明说的假设> | <e.g. 切回 desktop 时 sidebar 状态错乱> | c01 | ⚠ 0% |
| **A-2** | ... | | | |
| ... | | | | |

**每条详述** (top-3):

### A-1: ...
---

## 3.1 隐式假设拆解 (3 类) (v1.2 显式分类)

### 3.1.1 同组件假设 (默认) — **A-N** 形式

(就是 §3 的内容)

### 3.1.2 跨子组件假设 (同 god 不同子组件) — **A-N** 形式但加注 `[子组件]`

> 例: `A-1 [ProjectTrustDialogView]`: c01 useState `listing` 与 c02 渲染必须同步

### 3.1.3 **跨 god 假设** (依赖外部 hook god 或 component god) — **A-X-N** 形式 (v1.2 新增)

> **适用场景**: 本 god 依赖其它 god (e.g. ChatWindow 依赖 useAgentSession)。若该 god 未做 P1,假设无法验证。

| ID | 假设 | 涉及外部 god | 验证位置 |
|---|---|---|---|
| **A-X-1** | <假设描述> | `<god-name>` | `<god-name>/cross-cutting/l7-...md` (待 P1) |
| **A-X-2** | <e.g. useAgentSession streaming 状态机迁移正确> | `useAgentSession` | `useAgentSession/cross-cutting/l7-...md` |
| ... | | | |

**每条详述** (top-3):
- 假设描述
- 涉及外部 god 的 L7 引用 (待该 god 完成 P1 后回填)
- 跨 god 假设的失效后果

**重要**: 跨 god 假设**无法在本 god 内 e2e 验证**——必须等依赖 god P1 完成,且**AppShell 集成测试**才完整
---

## 4. 回归案例映射 (Regression Mappings)

> **从已知 bug 倒推**: 每个 bug 对应哪些不变量被破坏

| Bug ID | 描述 | 根因 (被破坏的不变量/假设) | 涉及 ID | 永久 e2e? |
|---|---|---|---|---|
| **Phase 0 bug #2** | 切 session 闪屏 | 3 处 setSessionKey 漏 1 处 | I-1 | ⚠ 待补 |
| ... | | | | |

**关键**:
- 每条 bug **必须**对应至少 1 个不变量
- 每条不变量 **必须**有 e2e 测试覆盖
- 未覆盖 → P3 plan 必补
---

## 5. 关键不变量可视化 (高优先) + P2 责任分配

```

graph LR

```text
I1[I-1: ...]
I2[I-2: ...]
...
```

```text
SS[useSessionStore]
BS[useBranchStore]
...
```

```text

**P2 责任分配** (草案,待 P2 spec 确认):

| 不变量 | P2 module 责任 | 优先级 |
|---|---|---|
| **I-1** | `useSessionStore.bumpSessionKey()` | 🔴 P1 |
| ... | | |

**P2 完整性检查**:

- [ ] 每个 I-N 有 module 责任
- [ ] 每个 C-N 有 seam 位置
- [ ] 每个 A-N 有 test 覆盖
- [ ] 每个 R-N 有 e2e 锁住
- [ ] **每个 A-X-N (跨 god) 有外部 god L7 引用** (v1.2 新增)

**任一未完成 = P2 spec 不完整,回去补**
---

## 6. 不变量反推: 假设清单生成 (本 god 工作流记录)

| 步骤 | 方法 | 工具 |
|---|---|---|
| 1. 列出所有 ref 与 state 配对 | grep 双向同步点 | L6 §2.4 |
| 2. 列出所有 async handler | grep `await` / `fetch` / `Promise` | L5 §6 |
| 3. 列出所有 setState 顺序敏感处 | grep 连续 setState | 人工 |
| 4. 列出所有 useState initializer 读外部 | grep useState 后 30 行 | L6 §2.6 |
| 5. 列出所有"if 条件 + 副作用"模式 | grep `if.*\{` 在 useEffect | L3 + L6 |
| 6. 列出已知 bug | 从 handoff 倒推 | 回归案例表 |
| 7. 每个 bug 找 1+ 不变量 | 反推 | 表格填充 |
| **8. 列出跨 god 依赖** (v1.2) | 见 §7 Linked god | INDEX §7 |
---

## 7. 验证清单 (V-*)

- [ ] **V-1**: 不变量数 vs 反模式数交叉
  - 公式: count(L6) ≤ count(L7)
- [ ] **V-2**: 每条不变量有 concern 责任
- [ ] **V-3**: 每条副作用契约有 SSR 标注
- [ ] **V-4**: 每条回归案例有 e2e
- [ ] **V-5**: P2 责任分配完整
- [ ] **V-6** (v1.2): 每条 A-X-N (跨 god) 标注外部 god L7 引用
---

## 8. Cross-references

- **Reads from**:
  - `../static/file-metadata.md` (state 列表)
  - `../concerns/c*.md` (全部 L2)
  - `../state-machines/sm-*.md` (全部 L3)
  - `../cross-cutting/l4-data-flow.md` §4 隐式合约
  - `../cross-cutting/l5-side-effects.md` (副作用清单)
  - `../cross-cutting/l6-anti-patterns.md` (反模式 → 破坏不变量)
  - `../INDEX.md` §6.1 (P2 必读清单) + §7 Linked god
- **Feeds into**:
  - **P1.5 Design Brief §10 (不变量→module 责任)**
  - **P2 spec §不变量映射** (本文档是输入)
  - P3 plan 每个 task 的 "Test must cover" 章节
  - e2e 测试设计 (不变量 → 测试用例)
  - 重构后回归测试 baseline
- **Verifies with**: §7 全部 V-* + P2 完整性检查 §5

```

---

## 模板要点 (v1.2)

- **L7 是 P1 → P1.5 → P2 的核心桥**——没有 L7,P1.5 + P2 就是"自由发挥"而不是"保持不变量"
- **§1-§3 三类不变量缺一不可**:
  - **不变量 (I-N)**: 状态 / 数据 必须满足的关系
  - **副作用契约 (C-N)**: 外部 IO 的前置/后置
  - **隐式假设 (A-N)**: 代码默认但没明说
- **§3.1.3 跨 god 假设 (v1.2 新增)**: 解决 ChatWindow → useAgentSession 类盲点
- **§4 回归案例映射是质量硬指标**——bug 找不到对应不变量 = 研究不深入
- **§5 P2 责任分配表是 P2 必交内容**——任何空白 = P2 spec 退回补
- **§6 假设生成方法是 P1 工作流的可复用步骤**——后续 god 直接套用

---

## L7 与 ADR 的区别

| 维度 | L7 | ADR |
|---|---|---|
| 时间 | 现状 | 决策点 |
| 来源 | 从代码反推 | 主动设计 |
| 用途 | 保护 (不要破坏) | 解释 (为什么这样决定) |
| 错误代价 | 违反 = bug | 决策错 = 需修订 ADR |

**L7 发现的隐式不变量,如果有重大设计含义,应考虑升级为 ADR**。
