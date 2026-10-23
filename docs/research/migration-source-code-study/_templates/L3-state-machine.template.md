# L3-state-machine.template — 状态机模板

> **何时用**: 当某 concern 内的 state 涉及 ≥ 3 态 + 复杂迁移时,独立成 sm-*.md
> **产出大小**: 100-300 行
> **依赖**: L2 concern 文档
> **被谁用**: L7 不变量提取(状态机即不变量)

```markdown
## sm-<stateName> — 状态机

> **写于**: <YYYY-MM-DD>
> **god**: <god 名>
> **关联 concern**: c<NN> (<concern 名>)
> **源码位置**: L<start>-L<end>
---

## 1. 状态定义

| 状态 | 类型 | 含义 | 起始默认 |
|---|---|---|---|
| `<state1>` | `<type literal>` | <description> | <e.g. `null`> |
| `<state2>` | `<type literal>` | <description> | <e.g. `idle`> |
| `<state3>` | ... | | |

**总状态数**: <N> (若 < 3,本 concern 不应独立状态机,合并回 c<NN>)
---

## 2. 迁移图

```

stateDiagram-v2
    [*] --> <init>: <entry>
    <state1> --> <state2>: <trigger>
    <state2> --> <state3>: <trigger>
    <state3> --> [*]: <exit>
    <state2> --> <state2>: <self-loop, e.g. 重试>

```text
---

## 3. 迁移表

| From | To | 触发条件 | 触发位置 (line) | 副作用 |
|---|---|---|---|---|
| `*` | `<init>` | mount | L<line> | <e.g. setActiveCwd(null)> |
| `<state1>` | `<state2>` | <e.g. cwd validate> | L<line> | <e.g. setStatus('validating')> |
| `<state2>` | `<state3>` | <e.g. success> | L<line> | <e.g. setStatus('ready')> |
| ... | | | | |
---

## 4. 关键不变量 (本状态机保护)

> **这些不变量通常会上升到 L7 跨 concern 文档**——本节是它们的"源头"

- **I-SM-1**: <e.g. `state2 → state3` 必须经过 `validate` 调用,不可直接 setState>
- **I-SM-2**: <e.g. `state1` 期间不可触发依赖 `<state3>.data` 的 render>
- ...
---

## 5. 并发 / race 风险

> **若状态机有 async 步骤或可被 abort**,记录 race 窗口

- 风险 1: <e.g. 慢响应覆盖新响应> → 用 token 防护 (L<line>)
- 风险 2: <e.g. abort 后回调仍执行> → 用 AbortController

**对应防护代码**:

- `workspaceRestoreTokenRef` (L<line>) — 防止慢响应覆盖
- `suppressCwdBumpRef` (L<line>) — 防止双 bump
---

## 6. 副作用契约

| 副作用 | 触发状态 | 时机 |
|---|---|---|
| <e.g. fetch /api/sessions> | `validating` | L<line> |
| <e.g. setItem localStorage> | `ready` | L<line> |
| ... | | |
---

## 7. 验证清单 (V-*)

- [ ] **V-1**: 状态字段定义位置

  ```

  grep -nE "type <StateName>|interface <StateName>" <path>.tsx

```text

  **期望**: <N> 处

- [ ] **V-2**: setState 调用位置

  ```

  grep -nE "set<StateName>\(" <path>.tsx

```text

  **期望**: <N> 处

- [ ] **V-3**: 迁移守卫代码存在

  ```

  grep -nE "if.*status.*===|useEffect.*status" <path>.tsx

```text

  **期望**: 至少 <N> 处
---

## 8. Cross-references

- **Reads from**:
  - `../concerns/c<NN>.md` (本 concern 的 state 定义)
- **Feeds into**:
  - `../cross-cutting/l7-implicit-invariants.md` (本状态机保护的不变量 I-SM-N)
  - P2 spec (状态机 → state machine library 选型)
- **Verifies with**: §7 全部 V-*

```

---

## 模板要点

- **本模板用于"重要"状态机**——3 态以下合并回 c<NN>;5+ 态必须独立
- **§4 不变量是 L7 的"原材料"**——L7 的 I-N 很多源自这里
- **§5 race 风险必须有"对应防护代码"**——只列风险不列防护 = 不合格
- **不引入 XState 词汇**——本宪法 §3.2 禁止,保持 plain TypeScript 风格
