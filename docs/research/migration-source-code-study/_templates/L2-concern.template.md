# L2-concern.template — 单个 concern 模板

> **何时用**: L1 完成后,按 `INDEX.md` §2 的 concern 列表逐个填写
> **产出大小**: 200-500 行 (含 mermaid 图)
> **依赖**: L1 (行号 / hook 计数)
> **被谁用**: L3 / L4 / L5 / L6 / L7 都会引用本文件
> **v1.1 修订**: §10 V-* 命令用 `^[[:space:]]*` 任意缩进,详见 `../../CONSTITUTION.md` §5.4

```markdown
## c<NN> — <Concern 名>

> **写于**: <YYYY-MM-DD>
> **god**: <god 名> (e.g. AppShell)
> **本 concern 起止行**: L<start>-L<end>
> **外部依赖**: <list of imports from this range>
---

## 1. 一句话定义

<这个 concern 在 god 内负责什么,1 句话>

例: "管理 sidebar / right panel 的显隐与宽度,响应 isMobile 切换"
---

## 2. 涉及 state 槽

> **数据来源**: L1 §2,本表只列本 concern 范围内的

| # | 行 | 名称 | 类型 | 备注 |
|---|---|---|---|---|
| 1 | L<line> | `<name>` | `<type>` | <e.g. 默认值 / 派生关系> |
| 2 | ... | | | |
---

## 3. 涉及 ref 槽

| # | 行 | 名称 | 类型 | 用途 |
|---|---|---|---|---|
| 1 | L<line> | `<name>` | `<type>` | <e.g. 同步读取 / 跨组件 imperative> |
---

## 4. 涉及 handler (useCallback)

| # | 行 | 名称 | 触发条件 | 副作用 |
|---|---|---|---|---|
| 1 | L<line> | `<name>` | <e.g. onClick> | <e.g. setState + URL replace> |
| 2 | ... | | | |
---

## 5. 状态机 (若适用)

> **若本 concern 涉及 ≥ 3 态**,在 concern doc 内嵌状态机。否则简单 setState 跳过本节。

```

stateDiagram-v2
    [*] --> <init_state>: <entry condition>
    <state1> --> <state2>: <transition trigger>
    <state2> --> <state3>: ...

```text

**关键不变量**:

- 状态 X → 状态 Y 必经 Z (if any)
- 状态 X 不可直接到状态 Y (if any)
---

## 6. 关键算法 (sequence / flow)

> **若本 concern 有 1 个 ≥ 30 行的核心 handler**,用 sequence 图描述

```

sequenceDiagram
    participant U as User
    participant <Comp> as <Component>
    participant <Lib> as <lib>
    U->><Comp>: <action>
    Comp->>Lib: <call>
    Lib-->>Comp: <result>
    Comp-->>U: <feedback>

```text

**核心算法描述** (≤ 5 行,补充 mermaid 表达不出的逻辑):

- 步骤 1: ...
- 步骤 2: ...
---

## 7. 外部依赖 (本 concern 范围)

| import | 来自 | 用途 |
|---|---|---|
| `<name>` | `<path>` | <e.g. 持久化 / URL 解析 / 状态派生> |
---

## 8. 涉及副作用

> **若本 concern 涉及 localStorage / DOM / 浏览器 API,记录在此**。完整副作用清单在 L5 跨切文档。

- [ ] localStorage key: `<key>` — 读 / 写 时机
- [ ] DOM mutation: <e.g. document.title>
- [ ] Browser API: <e.g. Notification / AudioContext / matchMedia>
---

## 9. 反模式 / 风险

> **若本 concern 含 imperative ref / stale closure / 已知 race**,记录在此**并交叉到 L6**

- 风险 1: <e.g. `chatInputRef` 跨子组件命令式调用> → (详见 L6 §3.1)
- 风险 2: ...
---

## 10. 验证清单 (V-*) — v1.1 修订

> **关键**: 用 `^[[:space:]]*` 任意缩进 + 不链 `&&`,详见 `../../CONSTITUTION.md` §5.4

- [ ] **V-1**: 本 concern state 槽数 = 表中行数 (赋值行模式,泛型鲁棒)

  ```

  awk 'NR>=<start> && NR<=<end>' <path>.tsx | grep -cE "^[[:space:]]*const \[[a-zA-Z_]+, set[A-Za-z]+"

```text

  **期望**: <N>

- [ ] **V-2**: 本 concern ref 槽数 = 表中行数 (赋值行模式)

  ```

  awk 'NR>=<start> && NR<=<end>' <path>.tsx | grep -cE "^[[:space:]]*const [a-zA-Z_]+ = useRef"

```text

  **期望**: <N>

- [ ] **V-3**: 本 concern handler 数 = 表中行数 (useCallback 赋值行)

  ```

  awk 'NR>=<start> && NR<=<end>' <path>.tsx | grep -cE "^[[:space:]]*const [a-zA-Z_]+ = useCallback"

```text

  **期望**: <N>

- [ ] **V-4**: 本 concern useEffect 数 (call site,任意缩进)

  ```

  awk 'NR>=<start> && NR<=<end>' <path>.tsx | grep -cE "^[[:space:]]*use(Effect|LayoutEffect)\("

```text

  **期望**: <N>
---

## 11. Cross-references

- **Reads from**:
  - `../static/file-metadata.md` (L1 行号 / hook 计数)
- **Feeds into**:
  - L3 状态机 (本 concern 内的 state machine)
  - L4 数据流 (本 concern 的输入/输出)
  - L5 副作用 (本 concern 涉及的 IO)
  - L6 反模式 (本 concern 的风险)
  - L7 不变量 (本 concern 保护什么)
- **Verifies with**: §10 全部 V-*

```

---

## 模板要点

- **每个 concern 是 1 个独立可读单元**——读者读单个 concern 不必读其它 concern
- **§5/§6 mermaid 是 L3 的"前置"**——如果状态机足够复杂,后续可独立到 `state-machines/sm-X.md`
- **§9 反模式必须交叉 L6**——避免本文件变成"反模式百科"
- **§10 V-* 是 KPI 复现率的分子**——L2 必须有具体 grep
