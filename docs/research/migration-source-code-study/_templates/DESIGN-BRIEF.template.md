# DESIGN-BRIEF.template — P1.5 设计提炼模板 (v1.2 新增)

> **何时用**: P1 (8 层) 完成后,**P2 spec 撰写前**
> **产出大小**: **200-500 行 (硬上限 500)**
> **依赖**: L1-L8 全部 + coverage-matrix
> **被谁用**: **P2 spec 的输入**(不是 spec 本身) + **P3 plan 的源头**
> **核心问题**: 把 8 层"事实 + 不变量"**提炼为"提议 + 决策依据"**,不替 P2 做最终决策

## 模板使用说明

### 设计原则

1. **P1.5 不是 spec**——spec 是 P2,P1.5 是 spec 的输入
2. **P1.5 提"建议"不提"决策"**——决策在 P2 spec
3. **P1.5 必须用 mermaid 图**——5+ 种图覆盖设计全貌
4. **P1.5 与 P2 的边界**: 详见 CONSTITUTION §8.3

### 章节组织 (13 节,严格 500 行上限)

```text
§1  Metadata + 来源 (5%)
§2  关注点→模块映射 (10%)
§3  关键 contracts (10%)
§4  组件图 (mermaid component) (8%)
§5  数据流图 (mermaid flow) (8%)
§6  状态机图 (mermaid state) (5%, 可选)
§7  时序图 (mermaid sequence, 1-2 个) (8%)
§8  类/接口图 (mermaid class, 可选) (5%)
§9  反模式消除清单 (10%)
§10 不变量→module 责任 (10%)
§11 改进建议 (L8 抽取) (8%)
§12 跨 god 假设 (5%)
§13 Design Quality Scorecard (8%)
```

---

```markdown
## Design Brief — <God 名>

> **写于**: <YYYY-MM-DD>
> **上游**: `migration-source-code-study/<god>/` (P1 L1-L8)
> **下游**: P2 spec 撰写
> **大小**: ~<N> 行(目标 350,硬上限 500)
> **关系**: P1 (事实) → **本文件 (提炼)** → P2 (决策)
---

## §1 Metadata + 来源 (5%, ~25 行)

| 项 | 值 |
|---|---|
| God 名称 | <name> |
| 源文件 | `ref_projects/pi-web/components/<File>.tsx` |
| 行数 | <N> |
| 关注点数 | <N> |
| 不变量总数 | <N> (I-N + C-N + A-N + R-N) |
| 反模式总数 | <N> (严格) + <N> (可读性) |
| P1 INDEX | `migration-source-code-study/<god>/INDEX.md` |
| P1 L1-L8 路径 | `migration-source-code-study/<god>/{static,concerns,state-machines,cross-cutting}/` |
| Coverage | <ratio>% (见 coverage-matrix) |
| Linked god | <list> |

**本 brief 范围**:
- ✅ 提炼 P1 8 层为可消费的设计提议
- ✅ 5+ mermaid 图覆盖设计全貌
- ❌ 不做最终决策 (P2 spec 的事)
- ❌ 不写实施细节 (P3 plan 的事)
---

## §2 关注点→模块映射 (10%, ~50 行)

> **从 L2 concerns 提炼**: 哪些 concern 应留在本组件?哪些应抽到 store / hook / lib?

| Concern | 起始行 | 状态 | 推荐形态 | 理由 |
|---|---|---|---|---|
| c01 <name> | L<start>-L<end> | ✅ 留本组件 | <leaf / hook> | <1 句话> |
| c02 <name> | L<start>-L<end> | ✅ 留本组件 | leaf | <1 句话> |
| c03 <name> | L<start>-L<end> | ⚠ 抽 store | zustand `useXxxStore` | <1 句话,引用 L7 I-N> |
| c04 <name> | L<start>-L<end> | ❌ 抽 lib | `lib/<name>.ts` | <1 句话> |
| ... | | | | |

**总决策**:
- 留本组件: <N>
- 抽 store: <N>
- 抽 lib: <N>
- 抽 hook: <N>

**关键决策依据** (引用 L7 I-N):
- c03 抽 store 的理由: I-1 (sessionKey bump) 需要跨组件共享 → 必须 store
- c04 抽 lib 的理由: I-2 (业务规则) 与 React 无关 → 纯函数可测
---

## §3 关键 contracts (10%, ~50 行)

> **从 L4 数据流 + props + 回调 提炼**: 本组件对外暴露什么,接收什么?

### §3.1 输入 (Props)

| Prop | 类型 | 必填 | 含义 | 来源 |
|---|---|---|---|---|
| `<name>` | `<type>` | 是/否 | <含义> | parent (AppShell c<N>) |
| ... | | | | |

### §3.2 输出 (回调)

| Callback | 签名 | 触发 | 接收方 |
|---|---|---|---|
| `<name>` | `(<params>) => void` | <触发条件> | parent |
| ... | | | |

### §3.3 内部 ref (imperative handle, 0=理想)

| Ref | 类型 | 暴露给 | 触发 |
|---|---|---|---|
| `<name>` | `<RefType>` | <子组件> | <触发> |

**关键不变量**: **0 个 imperative ref 暴露** = god 解耦成功的标志
- 若 > 0: 每个 ref 必有 L6 §2.1 标记 + L7 I-N 关联

### §3.4 副作用契约 (引用 L5)

| 资源 | 创建 | cleanup | 守卫 |
|---|---|---|---|
| AbortController | L<line> | L<line> abort | active 闭包 |
| setTimeout | L<line> | L<line> clearTimeout | timedOut flag |
| ... | | | |
---

## §4 组件图 (8%, ~40 行)

> **mermaid component diagram**: 本组件 + 子组件 + parent + lib 依赖

```

graph TB

```mermaid
subgraph Parent
A[AppShell c<N>]
end
```

```mermaid
subgraph ThisGod[本组件]
T[Title]
end
```

```mermaid
subgraph Children[子组件]
C1[<name> ~ <N> 行]
C2[<name> ~ <N> 行]
C3[<name> ~ <N> 行]
end
```

```mermaid
subgraph Libs[外部 lib]
L1[useI18n]
L2[<lib-name>]
L3[<lib-name>]
end
```

```mermaid
subgraph Hooks[自研 hook]
H1[useTheme]
H2[useResizablePanel]
end
```

```text
A -->|11 props| T
T -->|<callback>| A
T -->|render| C1
T -->|render| C2
T -->|render| C3
T -->|use| L1
T -->|use| L2
T -->|use| L3
T -.optional.->|use| H1
T -.optional.->|use| H2
```

```text

**关键观察**:

- <观察 1>
- <观察 2>
---

## §5 数据流图 (8%, ~40 行)

> **mermaid flow**: 数据从 props → state → 子组件 → callback 的完整路径

```

flowchart LR

```text
P[Parent props x<N>]
S1[useState: x]
S2[useState: y]
S3[useRef: z]
M[useMemo: derived]
C[useCallback: handle]
E[useEffect: side-effect]
Child[子组件 render]
Out[callback to parent]
```

```text
P -->|destructuring| S1
P -->|destructuring| S2
P -->|destructuring| S3
S1 --> M
S2 --> M
S3 -. ref pattern .-> C
M --> Child
C --> Child
E -. setState .-> S1
Child -->|onClick| C
C --> Out
```

```text

**关键观察**:

- <观察 1>
- <观察 2>
---

## §6 状态机图 (5%, ~25 行, 可选)

> **mermaid stateDiagram**: 复杂状态(≥3 态)必画,简单 setState 跳过

```

stateDiagram-v2

```text
[*] --> idle
idle --> loading: trigger
loading --> success: ok
loading --> error: fail
loading --> error: timeout
success --> [*]
error --> [*]
```

```text

**关键不变量**:

- 状态机迁移必须经 setState,不能 mutate
- <不变量 1>
- <不变量 2>
---

## §7 时序图 (8%, ~40 行, 1-2 个关键 flow)

> **mermaid sequence**: 关键 handler 或 async 流程

### §7.1 <关键流程 1 名称> (e.g. fetch 流程)

```

sequenceDiagram

```text
participant U as User
participant C as Component
participant AC as AbortController
participant F as fetch
```

```text
U->>C: action
C->>AC: new AbortController()
C->>F: fetch(url, { signal })
alt success
F-->>C: response
C->>C: setState(loaded)
```

```text
else error
F-->>C: throw
C->>C: setState(error)
```

```text
end
Note over C: cleanup
C->>AC: abort
```

```text

### §7.2 <关键流程 2 名称> (e.g. session 切换)

```

sequenceDiagram

```text
participant U as User
participant A as AppShell
participant SS as useSessionStore
participant CW as ChatWindow
```

```text
U->>A: click session
A->>SS: selectSession
SS->>SS: bumpSessionKey
SS-->>CW: remount (key change)
```

```text
---

## §8 类/接口图 (5%, ~25 行, 可选)

> **mermaid classDiagram**: god 的核心接口契约(若 god 有清晰的 interface)

```

classDiagram

```text
class Component {
+prop1: Type
+prop2: Type
-internalState: State
-ref: RefType
+handler1() void
+handler2() void
```

```text
}
class SubComponent {
+prop: Type
+callback: Function
```

```text
}
Component --> SubComponent
```

```text

**注**: 简单 leaf 可跳过此节(数据流已足够)
---

## §9 反模式消除清单 (10%, ~50 行)

> **从 L6 反模式 提炼**: 哪些反模式必消除?哪些保留(已有合理)?

| ID | 反模式 | 数量 | 严重度 | 消除方式 | P2 任务 |
|---|---|---|---|---|---|
| **R-1** | imperative ref 跨组件 | <N> | 🔴 | 改 store action / callback prop | T-<N> |
| **R-2** | module-level singleton | <N> | 🔴 | 改 callback prop | T-<N> |
| **R-3** | 双向 state-ref 同步 | <N> | 🟡 | 统一 state | T-<N> |
| **R-4** | useEffect cleanup 缺失 | <N> | 🔴 | 补 cleanup | T-<N> |
| **R-5** | SSR-unsafe storage | <N> | 🔴 | 推迟到 useEffect | T-<N> |
| **R-6** | 隐式业务规则散落 | <N> | 🟡 | 提 lifecycle hook | T-<N> |
| **R-7** | <specific> | <N> | <level> | <way> | T-<N> |

**反模式类型总结**:

- 必消除 (🔴): <N>
- 可改进 (🟡): <N>
- 保留 (✅): <N>

**决策依据**: 引用 L6 §4 "反模式 × 重构方向" 表
---

## §10 不变量→module 责任 (10%, ~50 行)

> **P1→P2 桥接核心**: L7 的 32 条不变量,在 P2 中**每条必须有 module 保护**

| I-N | 不变量 | P2 module 责任 | 状态 |
|---|---|---|---|
| **I-1** | <e.g. sessionKey bump on session switch> | `useSessionStore.bumpSessionKey()` | ✅ |
| **I-2** | <e.g. branchTree 清空 on session switch> | `useSessionStore.selectSession()` reset `useBranchStore` | ✅ |
| **I-3** | <e.g. projectKey consistency> | `useSessionStore.activeProjectKey = derived(...)` | ✅ |
| **I-4** | <e.g. fetch abort on unmount> | c01 useEffect cleanup | ✅ |
| ... | | | |
| **C-1** | localStorage[k] mount 读,commit 写 | (本组件) useResizablePanel 内部 | ✅ |
| **A-1** | <e.g. parent 在 cwd 变时 remount dialog> | (parent 责任) | ⚠ 待 AppShell c08 验证 |

**总不变量**: <N>
**已分配 module**: <N> / <N> = <pct>%
**未分配** = P2 spec 必须回头补
---

## §11 改进建议 (L8 抽取) (8%, ~40 行)

> **从 L8 §3 抽取**: 当前 → 推荐的对照表(P2 spec 决策输入)

| ID | 当前模式 | 推荐模式 | 收益 | 风险 | 优先级 |
|---|---|---|---|---|---|
| **L8-1** | 5+ 局部 fetch | react-query | 自动 loading/error | 引入 dep | 🔴 P1 |
| **L8-2** | 列表 1000+ 直接 map | @tanstack/react-virtual | 1000+ 流畅 | 引入 dep | 🔴 P1 |
| **L8-3** | <N> useState 散落 | zustand | 集中 + 优化 | 重构量大 | 🟡 P2 |
| **L8-4** | 5+ imperative ref | callback prop | 单向流 | 改 API | 🟡 P2 |
| **L8-5** | module-level singleton | callback prop | 可测试 | 改 lib | 🟡 P2 |
| **L8-6** | inline style 50+ | CSS module | 主题切换 | 样式重构 | 🟢 P3 |

**P2 spec 必须决策**: 接受 / 拒绝每条 + 理由
---

## §12 跨 god 假设 (5%, ~25 行)

> **L7 §3.1.3 跨 god 假设 提炼**: 本 god 依赖哪些外部 god?假设如何验证?

| A-X-N | 假设 | 外部 god | 验证位置 |
|---|---|---|---|
| **A-X-1** | <e.g. useAgentSession streaming 状态机迁移正确> | `useAgentSession` | `useAgentSession/cross-cutting/l7-...md` |
| **A-X-2** | <e.g. AppShell c08 状态机正确> | `AppShell` (待 P1) | `app-shell/cross-cutting/l7-...md` |
| ... | | | |

**总跨 god 假设**: <N>
**已验证** (依赖 god P1 完成): <N>
**未验证** (依赖 god 待 P1): <N> — P3 阻塞
---

## §13 Design Quality Scorecard (8%, ~40 行)

> **从 INDEX §6 提炼 + 细化**: 显式应用 SOLID + 设计模式

| 维度 | 状态 | 备注 |
|---|---|---|
| **SRP** (单一职责) | ✅/⚠/❌ | <原因> |
| **OCP** (开放-封闭) | ✅/⚠/❌ | <原因> |
| **LSP** (里氏替换) | ✅/⚠/❌ | <原因> |
| **ISP** (接口隔离) | ✅/⚠/❌ | <原因> |
| **DIP** (依赖倒置) | ✅/⚠/❌ | <原因> |
| **KISS** | ✅/⚠/❌ | <原因> |
| **DRY** | ✅/⚠/❌ | <原因> |
| **YAGNI** | ✅/⚠/❌ | <原因> |
| **Container/Presentational** | ✅/⚠/❌ | <原因> |
| **State Machine** | ✅/⚠/❌ | <原因> |
| **Deep Module** | ✅/⚠/❌ | <原因> |
| **God 反模式** (< 2000 LOC) | ✅/⚠/❌ | <行数> |

**总评分**: <num> ✅ / 12 = <pct>%

**关键失分项 (≤ 2)**:

1. <失分项 1> → 改进方向: <建议>
2. <失分项 2> → 改进方向: <建议>

**对照本项目基线** (evolved via V1-V3 验证):

- clean leaf (ProjectTrustDialog, BranchNavigator) 通常 11-12 ✅
- god (AppShell) 通常 6-8 ✅
- <本 god 得分> → 类别: clean leaf / god / middle
---

## 附录: 与 P2 / P3 的连接

| 本文件章节 | 流向 | 用法 |
|---|---|---|
| §2 关注点→模块 | → P2 spec 决策 | "本组件是否需要拆出 store / hook" |
| §3 contracts | → P2 spec "接口" 章节 | 锁定 props / callbacks / refs |
| §4 组件图 + §5 数据流图 | → P2 spec "架构" 章节 | 视觉化 |
| §6 状态机图 + §7 时序图 | → P2 spec "行为" 章节 | 锁定迁移 / 流程 |
| §9 反模式清单 | → P2 spec "重构任务" | 哪些必消除 |
| §10 不变量→module | → P2 spec "不变量映射" | 验证 P2 完整性 |
| §11 改进建议 (L8) | → P2 spec "技术决策" | 接受 / 拒绝 |
| §12 跨 god 假设 | → P3 plan "跨 god 任务" | 阻塞项明示 |
| §13 Scorecard | → P2 spec "质量目标" | 重构前后对比 |
---

**End of Design Brief v1.0.**

```

---

## 模板要点 (v1.2)

- **13 节严格 500 行**——5% 到 10% 比例分配
- **5+ mermaid 图强制** (§4 组件 + §5 数据流 + §6 状态 + §7 时序 + §8 类)— 缺图 = 不合格 brief
- **§2 关注点→模块** 是 brief 的**核心**——它告诉 P2"god 应保持 leaf 还是拆"
- **§10 不变量→module** 是 P1→P2 的**核心桥**——任一不变量无 module 责任 = P2 spec 不完整
- **§11 改进建议直接从 L8 抽取**——避免 P1.5 重新分析
- **§13 Scorecard 跨 god 对比**——所有 god 必填,evolved-pi/pi-web 可量化
- **附录"流向"** 让 P1.5 与 P2 边界清晰:P1.5 提建议,P2 决策
