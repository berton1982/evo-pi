# 宪法: god component 源码研究约定

> **版本**: v1.1 · **写于**: 2026-10-12 (初版) / 2026-10-12 (v1.1: 修 3 个 P1 bug)
> **适用**: evo-pi 重构迁移期,所有 god component 的源码研究阶段 (P1)
> **不适用**: 一次性小重构、bug fix、纯新功能
> **维护**: 跨能力共用,修订需在 issue 讨论

## Changelog

| 版本 | 日期 | 变更 | 触发 |
|---|---|---|---|
| **v1** | 2026-10-12 | 初版 | — |
| **v1.1** | 2026-10-12 | 修 3 个 P1 bug (见 §5.4) | V1 验证 (ProjectTrustDialog) |
|  |  | - 改 `^  const` → `^[[:space:]]*const` (L1 §2/V-3/V-5, L2 §10) | 嵌套函数 4 空格漏数 |
|  |  | - 改 useState/useRef 计数用赋值行模式,不依赖调用语法 | 泛型 useState<...>( 不被 useState\( 匹配 |
|  |  | - 加 §5.4 "V-* grep chain discipline" | `cmd1 && cmd2` 在 count=0 时短路 |

---

## 0. 背景与目的

### 0.1 解决什么问题

**大文档模式下 AI 读不全、记得少、跳着答**——这正是 2026-10-12 的 `01-appshell-migration.md`(4297 行单文档)出现 8 个自我修正 (O-1~O-8) 的根因:

- AI 在 4000+ 行文档中容易"扫读后模式匹配",细节遗漏
- 文档越长,后段内容被记住的概率越低
- 多轮迭代修订时,旧表述不会被自动清理,新旧并存
- 跨会话续接时,新 agent 倾向"挑几节看"而非"通读"

### 0.2 本宪法的目标

1. **强制拆分**: 单文档 ≤ 800 行(目标 200-500),单 god 必拆为多文档
2. **强制导航**: 每个 god 必有 `INDEX.md`,声明阅读模式(快速/标准/完整)
3. **强制验证**: 每个文档带"验证清单"section,可执行 grep 复现
4. **强制交叉引用**: 文档间互链 + 源码行号 + ADR 编号,闭环可查

---

## 1. 工作流总览 (P0 → P1 → P1.5 → P2 → P3 → 实施)

```text
P0 宪法 (本文件,跨能力)
   ↓
P1 8 层源码研究
   ├── L1 静态结构 + 静态拆分
   ├── L2 关注点分解
   ├── L3 状态机建模
   ├── L4 数据流契约
   ├── L5 副作用与资源
   ├── L6 反模式清单
   ├── L7 隐式不变量 (含跨 god 假设)
   └── L8 技术债务与改进建议 (v1.2 新增)
   ↓
P1.5 Design Brief (v1.2 新增)
   ├── §1 关注点→模块映射
   ├── §2 关键 contracts
   ├── §3 关键 sequence
   ├── §4 组件图
   ├── §5 数据流图
   ├── §6 状态机图
   ├── §7 时序图
   ├── §8 类/接口图 (可选)
   ├── §9 反模式消除清单
   ├── §10 不变量→module 责任
   ├── §11 改进建议 (L8 抽取)
   ├── §12 跨 god 假设
   └── §13 Design Quality Scorecard
   ↓
P2 Spec (writing-plans 输入)
   ↓
P3 Plan (writing-plans)
   ↓
P4 实施 (subagent-driven / executing-plans)
   ↓
P5 验证 (5 道门)
   ↓
P6 Handoff
```

### 1.1 P1 8 层研究框架 (v1.2 扩展)

| 层 | 名称 | 问什么 | 产出文件 | 何时做 |
|---|---|---|---|---|
| **L1** | 静态结构 | 文件多大,多少 hook/state | `static/file-metadata.md` | 第一步 |
| **L2** | 关注点分解 | 哪些业务关注堆在一起 | `concerns/cNN-name.md` × N | L1 后 |
| **L3** | 状态机建模 | 每个 concern 的状态迁移 | `state-machines/sm-name.md` | L2 后,合并进 concern 或独立 |
| **L4** | 数据流契约 | 跨 concern 的输入输出 | `cross-cutting/l4-data-flow.md` | L2 后 |
| **L5** | 副作用与资源 | localStorage / DOM / 网络 / 浏览器 API | `cross-cutting/l5-side-effects.md` | L2 后 |
| **L6** | 反模式清单 | imperative ref / module-level / stale closure | `cross-cutting/l6-anti-patterns.md` | L2 后 |
| **L7** | **隐式不变量** | **代码在保护什么不变量?** | `cross-cutting/l7-implicit-invariants.md` | **最后,所有层依赖** |
| **L8** | **技术债务与改进建议** (v1.2) | **当前技术栈缺失什么?推荐什么?** | `cross-cutting/l8-tech-debt.md` | L7 后,作为 P1.5 提炼的输入 |

**L7 + L8 是 P1 核心产出**——L7 描述"代码在保护什么",L8 描述"代码在欠什么"。**重构设计的本质是"在不破坏 L7 不变量 + 偿还 L8 债务的前提下重组 L1-L6"**。

### 1.1 依赖图

```text
L1 ──→ L2 ──┬──→ L3 (per concern)
             ├──→ L4 (cross-concern)
             ├──→ L5 (cross-concern)
             └──→ L6 (cross-concern)
                          ↓
                         L7 ←─┘ (依赖所有上层)
```

**关键纪律**: L7 不能在 L1-L6 之前做,否则会"猜不变量"

## 2. 目录结构

### 2.1 顶层布局

```text
docs/research/migration-source-code-study/
├── CONSTITUTION.md                ← 本文件 (跨能力)
├── _templates/                     ← 7 层模板 + INDEX 模板 (可复用)
│   ├── INDEX.template.md
│   ├── L1-static-structure.template.md
│   ├── L2-concern.template.md
│   ├── L3-state-machine.template.md
│   ├── L4-data-flow.template.md
│   ├── L5-side-effects.template.md
│   ├── L6-anti-patterns.template.md
│   └── L7-implicit-invariants.template.md
│
├── app-shell/                      ← per-god 子文件夹
│   ├── INDEX.md                    ← 必读: 导航 + 阅读模式
│   ├── static/
│   │   └── file-metadata.md        ← L1
│   ├── concerns/                   ← L2 (per concern)
│   │   ├── c01-layout-shell.md
│   │   ├── c02-url-derivation.md
│   │   └── ... (N 个,按 god 实际 concerns 拆)
│   ├── state-machines/             ← L3 (重要状态机单独抽出,次要合并进 concern)
│   │   ├── sm-initialCwdStatus.md
│   │   └── ...
│   └── cross-cutting/              ← L4/L5/L6/L7
│       ├── l4-data-flow.md
│       ├── l5-side-effects.md
│       ├── l6-anti-patterns.md
│       └── l7-implicit-invariants.md
│
├── session-sidebar/                ← 同上结构
├── chat-window/                    ← 同上结构
├── chat-input/                     ← 同上结构
└── message-view/                   ← 同上结构
```

### 2.2 文件命名约定

- **顶级**: `CONSTITUTION.md` (大写) · `_templates/` (下划线前缀,排序置底)
- **per-god 目录**: kebab-case (`app-shell/`, `chat-input/`)
- **per-god 文件**:
  - `INDEX.md` (大写,索引标识)
  - `static/file-metadata.md`
  - `concerns/cNN-short-name.md` (c 前缀 + 2 位数字 + kebab)
  - `state-machines/sm-stateName.md` (sm 前缀 + PascalCase 状态名)
  - `cross-cutting/lN-theme.md` (l 前缀 + 层号 + kebab)

### 2.3 数字编号规则

- **concern 编号** 必须在 `INDEX.md` 列出完整 mapping (e.g. c01=布局 shell, c02=URL 派生)
- **编号稳定**: 一旦定下不重排,即使后续发现遗漏 concern 也只能补号 (c01a 或 c21),不重排 c01-c20
- **状态机编号** 不强制,用名称即可

---

## 3. 文档粒度与边界

### 3.1 单文档大小

| 指标 | 目标 | 硬上限 | 触发动作 |
|---|---|---|---|
| 行数 | 200-500 | 800 | 超过上限必须拆 |
| section 数 | 3-7 | 10 | 超过 10 个 section 考虑分组 |
| mermaid 图 | 1-3 | 5 | 超过 5 个图考虑合并/外链 |
| 表格行数 | 5-30 | 50 | 大表拆成"主表 + 附录" |
| 代码片段 | ≤ 30 行 | 50 | 大片段改成指针 (path:line) |

### 3.2 单文档聚焦

每个文档只回答**一个核心问题**:

| 文档类型 | 核心问题 |
|---|---|
| `L1-static-structure.md` | "这个文件长什么样?" |
| `concerns/cNN.md` | "这个 concern 在做什么,怎么做的?" |
| `state-machines/sm-X.md` | "状态 X 怎么迁移?" |
| `cross-cutting/l4-data-flow.md` | "数据怎么在 concerns 间流动?" |
| `cross-cutting/l5-side-effects.md` | "外部资源怎么用?" |
| `cross-cutting/l6-anti-patterns.md` | "哪些写法有风险?" |
| `cross-cutting/l7-implicit-invariants.md` | "代码在保护什么不变量?" |

**多问题 = 多文档**。不要把"状态机"和"数据流"塞进同一个 concern doc。

### 3.3 禁止的反模式

- ❌ **mega-doc**: 任何单文档 > 800 行(等价于把 2026-10-12 的 4297 行单 doc 重新制造)
- ❌ **重复内容**: 同一信息出现在两个文档 (改用"详见 X"指针)
- ❌ **隐式编号**: 不在 INDEX 列 concern mapping,读者猜不到 c01 是啥
- ❌ **未验证数据**: 不附 grep 命令的"事实"
- ❌ **过期不重跑**: 报告写完 6 个月后,文件变了不重跑 L1 复现

---

## 4. AI 消费协议 (本宪法最关键)

### 4.1 阅读模式

每个 god 的 `INDEX.md` 必须**显式定义 3 种阅读模式**:

| 模式 | 时长 | 必读 | 用途 |
|---|---|---|---|
| **Quick scan** | 5-10 分钟 | INDEX + L1 + 1-2 个核心 concern + L7 | "这 god 在做什么" |
| **Standard dive** | 30-60 分钟 | INDEX + L1 + 所有 concern + L4 + L5 + L7 | "准备改这个 god" |
| **Full audit** | 2-4 小时 | 全部文档 | "重构设计阶段 + 验证完备性" |

**不列阅读模式的 INDEX.md = 不合格 INDEX**。

### 4.2 强制交叉引用 (close the loop)

每个文档必须能回答 3 个问题:

1. **它读了什么**? (Reads from: L1 / L2 / 其它文档)
2. **它产出什么**? (Feeds into: 哪个 P2 spec 章节 / 哪个 plan task)
3. **它怎么被验证**? (Verifies with: 哪些 grep 命令 / 哪些测试)

**任何 1 项缺失 = 该文档不可信**。

### 4.3 AI 必读检查 (agent 自检)

AI agent 在消费 P1 产物前,必须:

```bash
## 1. 确认 god 目录存在
ls docs/research/migration-source-code-study/<god>/

## 2. 读 INDEX.md
cat docs/research/migration-source-code-study/<god>/INDEX.md

## 3. 按当前任务的"阅读模式"读必需文档
## 4. 在 plan/spec 中显式引用: "读自 L7-implicit-invariants.md 的 I-3"
```

**禁止 AI agent 直接读 god 源码跳文档**——文档是 source-of-truth,源码是 ground-truth,两者必须 1:1 关联

## 5. 验证协议

### 5.1 每个文档的"验证清单" section

模板 (每文档必填):

```markdown
## 验证清单

数据来源: <path:line 或 grep 命令>

- [ ] **V-1**: <可执行的复现命令>
  ```

## 命令

```text

  **期望**: <输出>

- [ ] **V-2**: ...

```

**关键**:

- 命令必须能在新克隆的 repo 上**原样执行**
- 期望输出必须有**具体数字** (e.g. "45",不是 "约 45")
- 每 6 个月或 god 源码变更时,必须重跑全部 V-*

### 5.2 复现率指标 (KPI)

每个 god 完成 P1 后,记录:

- 总 L1-L6 事实点数 (N1)
- 总 V-* 验证命令数 (N2)
- 复现率 = N2 / N1 (目标 ≥ 0.8)

**低复现率 = 该研究不可信,补 grep**。

### 5.3 变更检测

L1 (static structure) 必须**每次都重跑**——因为源码会变。例:

- 2026-10-12 报告 01 写时 AppShell 是 2713 行
- 2026-10-12 实际复测: 2791 行 (+78)
- 差异说明源码在此期间被修改,**报告数字已过期**

**L1 数字必须每张 P1 PR 重测**。

### 5.4 V-* grep chain discipline (v1.1 新增,3 个 P1 bug 教训)

> **背景**: V1 验证 (ProjectTrustDialog) 暴露 3 个 P1 bug,都是 grep 模式本身的坑。

**bug #1 — 泛型不匹配**:

- ❌ `grep -cE "useState\("` 漏 `useState<...>(...)` 形式
- ✅ 用**赋值行模式** `grep -cE "^[[:space:]]*const \[[a-zA-Z_]+, set[A-Za-z]+"`,不依赖调用语法

**bug #2 — 缩进不匹配**:

- ❌ `grep -cE "^  const ..."` 固定 2 空格,漏嵌套函数 4 空格
- ✅ 用 `^[[:space:]]*` 任意缩进

**bug #3 — 链式 && 短路**:

- ❌ `cmd1 && cmd2` 在 cmd1 退出 1 时(cmd1 count=0)cmd2 不跑
- ✅ 用 `cmd1 ; cmd2` 或写两个独立命令

**规则**:

1. **永远用 `^[[:space:]]*`** 不用 `^`——前者匹配任意缩进
2. **hook 计数用赋值行** — `const [X, setX] = useState(...)` 或 `const X = useRef(...)`,对泛型鲁棒
3. **V-* 命令不链 `&&`** — 用 `;` 或独立运行
4. **每条 V-* 都测 0 也要成功** — count=0 不是失败,是事实

**正确的 V-* 模板** (L1):

```bash
## 计数: useState (用赋值行,泛型鲁棒)
grep -cE "^[[:space:]]*const \[[a-zA-Z_]+, set[A-Za-z]+" <path>

## 计数: useRef (用赋值行,泛型鲁棒)
grep -cE "^[[:space:]]*const [a-zA-Z_]+ = useRef" <path>

## 计数: useEffect (call site,无泛型,任意缩进)
grep -cE "^[[:space:]]*use(Effect|LayoutEffect)\(" <path>
```

**为什么用赋值行模式**:

- `const [X, setX] = useState<...>(...)` 一定有 1 个赋值行
- `useState\(` 模式漏泛型形式
- 赋值行模式对所有 React 版本鲁棒

---

## 6. 跨引用规则

### 6.1 引用语法

| 引用对象 | 格式 | 例 |
|---|---|---|
| 同 god 文档 | 相对路径 | `(见 concerns/c01-layout-shell.md)` |
| 跨 god 文档 | 相对路径 (从 `migration-source-code-study/`) | `(见 app-shell/cross-cutting/l7-implicit-invariants.md)` |
| 源码 | `path:line-range` | `AppShell.tsx:218-294` |
| ADR | `[ADR-NNNN]` | `[ADR-0003]` |
| Issue / PR | `#NNN` | `#142` |
| handoff doc | 相对路径 | `docs/handoffs/2026-10-10-phase-0-handoff.md` |

### 6.2 反向引用 (back-link)

每文档末尾必须有 "Cross-references" section:

```markdown
## Cross-references

- **Reads from**:
  - `static/file-metadata.md` (uses L1 counts)
  - `concerns/c01-layout-shell.md` (uses 状态机定义)
- **Feeds into**:
  - P2 spec: 不变量映射表 (I-1, I-2, I-3)
  - Plan task: T-04 "迁移 useResizablePanel"
- **Verifies with**:
  - V-1: `grep -cE "^  const \[.+, set.+\] = useState" AppShell.tsx` = 45
  - V-2: ...
```

---

## 7. 与 P2 / P3 的桥接

### 7.1 P1 → P2 (设计 spec) 必传

P2 spec 撰写时,**必须显式引用 P1 文档**:

```markdown
## 不变量映射 (来自 L7)

| L7 不变量 | P2 module 责任 | 状态 |
|---|---|---|
| I-1: 切 session sessionKey++ | useSessionStore.bumpSessionKey() | ✅ 已分配 |
| I-2: SSR sessionStorage 不可用 | useInitialCwd (mount-only) | ✅ 已分配 |
| I-N: ... | ... | ... |

**任何 I-N 状态为 ❌ = P2 不完整,必须回去补**
```

### 7.2 P1 → P3 (plan task) 必传

P3 plan 每个 task 头必带:

```markdown
### Task N: ...

**Reads from**:
- `migration-source-code-study/app-shell/cross-cutting/l7-implicit-invariants.md` (I-1, C-3)

**Test must cover**:
- [ ] I-1: 切 session 后 ChatWindow remount
- [ ] C-3: localStorage 写入时机
```

---

## 8. 已知 god 清单 (本仓库)

### 8.1 一级 god (按 line count 排序)

| god 文件 | 行数 | 状态 | 优先级 |
|---|---|---|---|
| `SessionSidebar.tsx` | 2903 | 报告 02 已写,需按新结构重整 | P1 |
| `ChatInput.tsx` | 2869 | 报告待写 (P1) | P2 |
| `AppShell.tsx` | 2791 | 报告 01 已写,需按新结构重整 | P3 |
| `ChatWindow.tsx` | 2258 | 报告 03 已写,需按新结构重整 | P4 |
| `MessageView.tsx` | 2152 | 报告待写 (P1) | P5 |
| `FileViewer.tsx` | 1897 | 较小但仍是 god,待评估 | P? |

### 8.2 二级 god (config 类,需独立评估)

| 文件 | 行数 | 备注 |
|---|---|---|
| `ModelsConfig.tsx` | 2313 | settings 内,是否拆为 god 看 P2 决定 |
| `McpConfig.tsx` | 2258 | settings 内,同上 |

### 8.3 评估流程

每个 god 在 P1 启动时先评估:

1. 行数 > 1500? → 必入 P1
2. 跨多个 concern / hook god? → 入 P1
3. 仅是"长但单 concern"? → 暂不入 P1,记入 backlog
4. 已被 React lazy 隔离? → 暂不入 P1

---

## 9. 文档维护

### 9.1 何时更新

| 触发 | 动作 |
|---|---|
| god 源码变更 (任何 commit) | L1 必须重跑 |
| god 源码变更 ≥ 50 行 或跨 5+ 文件 | 全 L1-L7 重审 |
| 新 concern 发现 | INDEX concern 列表更新 (用 c-NN+1 不重排) |
| 新不变量发现 | L7 + INDEX 双向更新 |
| P2 spec 引用本文档 | spec 应回写链接,建立双向引用 |
| 6 个月无更新 | 全面 review + 重跑 V-* |

### 9.2 撤销与重做

- 单文档过期 → 直接重写,不用 "DEPRECATED" 标记 (宪法 §3.3 禁止旧表述)
- god 全部 P1 文档过期 → 在 INDEX 顶部加"rebuild"banner,声明废弃原因

---

## 10. 已知遗留 (本宪法不完美之处)

| 项 | 描述 | 决策 |
|---|---|---|
| 模板 vs 实际填写的差异 | 模板是空骨架,实际 god 文档需大量填写 | 第一份完整示例 (c01-layout-shell.md) 已就位,后续 god 照此填写 |
| 跨 god 引用 | 不同 god 的 L7 可能有共享不变量 | 见 §7.1,目前用相对路径,**未来可能需要 god-shared/ 目录** |
| AI agent 自动续写 | AI 是否能按本宪法 1:1 重写报告 01/02/03 | **未验证**。需要第一个 god 完成后实测 |
| grep 复现与 ci 集成 | V-* 命令可不可以跑成 CI gate | 暂手动,后续可能落 `scripts/verify-source-study.sh` |

---

## 附录: 快速上手 (per god 5 步)

```bash
## 1. 创建 god 目录
mkdir -p docs/research/migration-source-code-study/<god>/{static,concerns,state-machines,cross-cutting}

## 2. 复制 INDEX 模板,填入 god 特定的 concern 列表
cp _templates/INDEX.template.md <god>/INDEX.md

## 3. 跑 L1 (静态结构)
wc -l ref_projects/pi-web/components/<File>.tsx
grep -cE "^  const \[" ref_projects/pi-web/components/<File>.tsx
## ... (见 L1 模板的 V-*)

## 4. 逐 concern 填 L2-L3
## 每个 concern 1 个 md 文件,内嵌状态机 (或独立 sm-*.md)

## 5. 最后填 L4-L7
## L7 最重要,必须在所有其它层完成后做
```

---

## 8. P1.5 Design Brief 阶段 (v1.2 新增)

> **目的**: 在 P1 与 P2 之间增加"设计提炼"层,避免 01-report §8-§10 的过度设计,又提取其价值。

### 8.1 P1.5 与 P2 的关系

```text
P1 (8 层) → 大量事实 + 32 条不变量
   ↓
P1.5 (Design Brief) → 提炼:
   - 关注点→模块映射 (1 张表)
   - 关键 contracts (1 张表)
   - 5+ UML 图 (组件/数据流/状态/时序/类接口)
   - 不变量→module 责任 (1 张表)
   - 改进建议 (L8 抽取)
   - Design Quality Scorecard
   ↓
P2 (Spec) → 引用 P1.5,聚焦 "为什么这样设计 + trade-off"
```

### 8.2 P1.5 模板

`_templates/DESIGN-BRIEF.template.md`(500 行硬上限)

**11 个 section**:

1. Metadata + 来源
2. 关注点→模块映射
3. 关键 contracts
4. 组件图 (component diagram, mermaid)
5. 数据流图 (data flow diagram, mermaid)
6. 状态机图 (state diagram, mermaid)
7. 时序图 (sequence diagram, mermaid)
8. 类/接口图 (class/interface, mermaid, 可选)
9. 反模式消除清单
10. 不变量→module 责任
11. 改进建议 (L8 抽取)
12. 跨 god 假设
13. Design Quality Scorecard (SOLID + 模式)

### 8.3 P1.5 vs P2 的边界

| 维度 | P1.5 (Design Brief) | P2 (Spec) |
|---|---|---|
| 目的 | 提炼事实 → 设计提议 | 决策 + 锁定 |
| 大小 | 200-500 行 | 视 god 复杂度 |
| 受众 | 自己 + 下游 designer | 下游 implementer |
| 形式 | 表格 + mermaid + 短文 | prose + 决策 |
| 多次迭代 | 是 | 锁定后不轻易改 |
| 失败 | 容易重做 | 难重做 |

---

## 9. Design Quality Evaluation (v1.2 新增)

> **目的**: 显式应用 SOLID + 设计模式,统一术语,提升 spec 质量。

### 9.1 设计原则 (应用于 L1-L7 + Design Brief)

| 原则 | 适用范围 | 评估位置 |
|---|---|---|
| **SRP** (单一职责) | L2 concerns 切分 | 每 concern 1 句话定义 |
| **OCP** (开放-封闭) | L4 数据流 | 新 concern 不需改现有 |
| **LSP** (里氏替换) | L4 refactor | 子类型可替代 |
| **ISP** (接口隔离) | L7 不变量 | 不变量责任不依赖"god 提供所有" |
| **DIP** (依赖倒置) | L4 数据流 | 子组件依赖 prop,不是具体实现 |
| **KISS** | 整个 | 反对过度设计 |
| **DRY** | L6 反模式 | 持久化 key 重复 = 风险 |
| **YAGNI** | 整个 | 反对预拆 / 预引 zustand |

### 9.2 设计模式 (应用于 Design Brief §4-§8)

| 模式 | 适用场景 | 在 god 中的体现 |
|---|---|---|
| **Container/Presentational** | AppShell 容器 + children | L4 |
| **State Machine** | listing 3 态等 | L3 + Design Brief §6 |
| **Provider/Context** | Theme/I18n/QueryClient | (顶层) |
| **Observer** | useSyncExternalStore | L1 |
| **Adapter** | fetch + AbortController | L5 |
| **Facade** | useResizablePanel (14 个 useEffect) | L1 |
| **Composition** | 子组件树 | L4 |
| **Module/Slot** | codebase-design 词汇 | Design Brief |
| **Deep Module** | 小接口 + 多实现 | Design Brief §5 scorecard |

### 9.3 反模式 (应用于 L6)

来自 Fowler *Refactoring* Ch.3 + codebase-design:

- **God Component** (>2000 LOC) — L1 触发
- **God Hook** (>2000 LOC hook) — L1 触发
- **Imperative Ref 跨组件** — L6 §2.1
- **Module-level Singleton in Hook** — L6 §2.2
- **Stale Closure Workaround** — L6 §2.3
- **双向 State-Ref 同步** — L6 §2.4
- **useEffect Cleanup 缺失** — L6 §2.5
- **SSR-Unsafe Storage 访问** — L6 §2.6
- **Prop Drill ≥ 5 层** — L6 §2.7
- **隐式业务规则散落** — L6 §2.8

### 9.4 INDEX §6 Design Quality Scorecard (v1.2 新增)

每 god INDEX 必填,统一位置便于跨 god 对比:

| 维度 | ✅/⚠/❌ | 备注 |
|---|---|---|
| SRP | ✅/⚠/❌ | 多少 concern,每个 1 句话能说清吗? |
| OCP | ✅/⚠/❌ | 新 concern 是否需要改现有? |
| LSP | ✅/⚠/❌ | 子组件可被替代吗? |
| ISP | ✅/⚠/❌ | 不变量责任是否分散? |
| DIP | ✅/⚠/❌ | 子组件依赖 prop 吗? |
| KISS | ✅/⚠/❌ | 是否有过度设计痕迹? |
| DRY | ✅/⚠/❌ | 有重复 key / 重复规则吗? |
| YAGNI | ✅/⚠/❌ | 有预拆 / 预引吗? |
| Container/Presentational | ✅/⚠/❌ | 容器 vs 叶子清晰? |
| State Machine | ✅/⚠/❌ | 复杂状态有显式建模? |
| Deep Module | ✅/⚠/❌ | hook 接口小 + 实现深? |
| God 反模式 | ✅/⚠/❌ | < 2000 LOC? |

**总评分** = ✅ 数 / 12

## 10. L8 技术债务层 (v1.2 新增,源自反思 Q3b)

> **目的**: L7 描述"代码在保护什么",L8 描述"代码在欠什么"——为 P1.5 + P2 提供改进方向。

### 10.1 L8 vs L6 区别

| 维度 | L6 反模式 | L8 技术债务 |
|---|---|---|
| 关注 | **当前**已有的反模式 | **当前**技术栈缺失 / 不匹配 |
| 输出 | 反模式列表 + 重构方向 | 改进建议表 (当前 → 推荐) |
| 严重度 | 代码层面风险 | 架构层面机会 |

### 10.2 L8 模板

`_templates/L8-tech-debt.template.md`:

```markdown
## L8 技术债务 — <God>

## 1. 当前技术栈清单 (from L1)
| 类别 | 当前 | 状态 |
|---|---|---|
| 状态管理 | useState + useRef | 内部 |
| 数据获取 | fetch + useEffect | ⚠ 无 loading/error 抽象 |
| 列表渲染 | 直接 map | ⚠ 大列表无虚拟化 |
| ...

## 2. 缺失/不匹配项
| 类别 | 当前 | 缺失 | 建议引入 |
|---|---|---|---|
| 数据获取 | fetch + useState | loading/error/retry 抽象 | react-query |
| 列表渲染 | 直接 map | 1000+ 项性能 | @tanstack/react-virtual |
| 跨组件 state | 14 个 useState 散落 | 集中 | zustand |
| ...

## 3. 改进建议
| 当前模式 | 推荐模式 | 收益 | 风险 | 优先级 |
|---|---|---|---|---|
| 5+ 局部 fetch (useState + useEffect) | react-query mutations | 自动 loading/error | 引入 dep | P1 |
| SessionSidebar 列表 1000+ (估计) | @tanstack/react-virtual | 渲染 1000+ 流畅 | 引入 dep | P1 |
| ... | ... | ... | ... | ... |
```

### 10.3 L8 与 P1.5 / P2 的连接

- L8 §3 改进建议表 **直接复制** 到 P1.5 Design Brief §11
- P2 spec 引用 L8 §3 决策:接受/拒绝 + 理由

---

## 11. Coverage Matrix — 防幻觉/遗漏机制 (v1.2 新增)

> **目的**: 解决"AI 读 445 行源码不完整"的根因。

### 11.1 问题

V-* 命令只能验证**数字**(useState 计数 = 1),**不**验证**内容覆盖**:

- 某行代码 AI 是否**真的读过**?
- 是否**理解了**该行?
- 是否**漏掉了**某段代码?

### 11.2 解决方案: coverage matrix

每个 god 必有 `coverage-matrix.md`(`migration-source-code-study/<god>/coverage-matrix.md`):

```markdown
## <God> Coverage Matrix

## 1. 文件分块
| 块号 | 行号 | 一句话总结 | 引用 L* |
|---|---|---|---|
| §1.1 | L1-L50 | imports + Props + 4 helper | L1 §3 |
| §1.2 | L51-L100 | isMessageEntry + compressChain | L2 c01 |
| ... | | | |

## 2. 覆盖率统计
- 总行数: <N>
- 已读块数: <N>
- 覆盖率: <N>%
- L* 文档引用行号数: <N>
```

### 11.3 强制要求

- 任何 claim "L100 是 ..." 必须能溯源到 coverage-matrix 的某块
- 任何 god P1 完成前必须跑 `verify-p1-completeness` skill 检查覆盖率

---

## 12. 跨 god 假设 (Linked god) (v1.2 新增)

> **问题**: ChatWindow 依赖 useAgentSession (2750 行的 god hook),AppShell 依赖 5+ hook god。**每个 god 不能独立 P1**。

### 12.1 解决方案: Linked god 表

每个 god INDEX 加 **§7 Linked god** section:

```markdown
## 7. Linked god (跨 god 依赖)

| 依赖 god | 文件 | 行数 | 类型 | 状态 |
|---|---|---|---|---|
| `useAgentSession` | `hooks/useAgentSession.ts` | 2750 | hook god | ⚠ 未 P1 化 |
| `useI18n` | `hooks/useI18n.ts` | 80 | 普通 hook | ✅ 已读 |
```

L7 模板加"**跨 god 假设**" subsection:

```markdown
### A-N: 跨 god 假设

| ID | 假设 | 验证位置 |
|---|---|---|
| A-X-1 | useAgentSession streaming 状态机迁移正确 | useAgentSession L7 (待 P1) |
```

### 12.2 实施顺序

1. **数据层 god 优先** (useAgentSession 之类)
2. **消费层 god 次之** (ChatWindow 之类)
3. **组合层 god 最后** (AppShell 之类)

---

## 13. 01-report 章节归档策略 (v1.2 新增,源自反思 Q2)

`docs/research/2026-10-12-refactor-migration/01-appshell-migration.md` 4297 行,**不直接搬运**,但**有价值的部分作为 P1 输入**:

| 章节 | 价值 | 复用方式 |
|---|---|---|
| §0-§1 metadata + 整体结构 | ⭐⭐⭐⭐ | INDEX.md 输入 |
| §2 20 concerns 详细 | ⭐⭐⭐⭐⭐ | 拆分到 per-concern c*.md(v1.1 重测行号) |
| §3 完整 state 槽清单 | ⭐⭐⭐⭐⭐ | L1 重写 |
| §4 关键算法 + sequence | ⭐⭐⭐⭐⭐ | c*.md + sm-*.md |
| §5.1 类图 | ⭐⭐⭐⭐⭐ | Design Brief §4 |
| §6 已知问题 | ⭐⭐⭐⭐ | L6 输入 |
| §8-§10 concern→store 映射 | ⭐ | **舍弃**(YAGNI) |
| §13 14 store TS interface | ⭐ | **舍弃**(过度设计) |
| §14.5 useSessionLifecycle | ⭐⭐ | **保留为"待评估"** |
| §15-§16 元评审 | n/a | **不保留** |

**净策略**:

- AppShell P1 **新建** 27 个 P1 文档,**不用** 01-report 的内容直接 copy
- 01-report 的有价值的部分作为**理解 input**,不是**搬运 source**
- 01-report 保留为"**初始事实档案 v0**",不删但加 banner

---

## 14. Convention vs Skill 划分 (v1.2 新增,源自反思 Q1)

| 形态 | 内容 | 路径 | 调用时机 |
|---|---|---|---|
| **Convention** | CONSTITUTION.md + 11 模板 | `_templates/` | always-on |
| **Skill** | `verify-p1-completeness` | `_skills/verify-p1-completeness/SKILL.md` | P1 完成后 |
| **Skill** | `extract-design-brief` | `_skills/extract-design-brief/SKILL.md` | P1 → P1.5 |
| **Skill** | `verify-p2-bridge` | `_skills/verify-p2-bridge/SKILL.md` | P2 spec 完成后 |

**理由**: 工作流跨数天多 god,不是单次 skill 调用能覆盖。CONSTITUTION + 模板 = always-on convention;3 个 skill = 关键 gate

## 15. 模板索引 (v1.2 全套)

| 模板 | 路径 | 状态 | 行数上限 |
|---|---|---|---|
| INDEX | `_templates/INDEX.template.md` | v1.2 (加 §6 scorecard + §7 linked god) | 200 |
| L1 static structure | `_templates/L1-static-structure.template.md` | v1.1 (用 v1.1 grep 模式) | 300 |
| L2 concern | `_templates/L2-concern.template.md` | v1.1 | 500 |
| L3 state machine | `_templates/L3-state-machine.template.md` | v1.0 | 300 |
| L4 data flow | `_templates/L4-data-flow.template.md` | v1.0 | 400 |
| L5 side effects | `_templates/L5-side-effects.template.md` | v1.0 | 400 |
| L6 anti-patterns | `_templates/L6-anti-patterns.template.md` | v1.0 | 500 |
| L7 implicit invariants | `_templates/L7-implicit-invariants.template.md` | v1.2 (加跨 god 假设) | 500 |
| **L8 tech debt** | `_templates/L8-tech-debt.template.md` | v1.2 新增 | 300 |
| **Design Brief** | `_templates/DESIGN-BRIEF.template.md` | v1.2 新增 | **500 (硬)** |
| **Coverage Matrix** | `_templates/COVERAGE-MATRIX.template.md` | v1.2 新增 | 200 |

## 16. Skills 索引 (v1.2 全套)

| Skill | 路径 | 触发 | 用途 |
|---|---|---|---|
| `verify-p1-completeness` | `_skills/verify-p1-completeness/SKILL.md` | P1 完成后 | 验证 V-* 复现率 + 跨引用 + 覆盖率 + 不变量责任 |
| `extract-design-brief` | `_skills/extract-design-brief/SKILL.md` | P1 → P1.5 | 从 L1-L8 提取 Design Brief |
| `verify-p2-bridge` | `_skills/verify-p2-bridge/SKILL.md` | P2 spec 完成后 | 检查 L7 不变量 → module 责任映射 |

---

**End of Constitution v1.2.**
