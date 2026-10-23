# L4-data-flow.template — 数据流契约模板

> **何时用**: L2 完成后,描述跨 concern 的数据流向
> **产出大小**: 150-400 行
> **依赖**: L2 全部 concern 文档
> **被谁用**: P2 设计 (store action / hook 接口)

```markdown
## L4 数据流契约

> **写于**: <YYYY-MM-DD>
> **god**: <god 名>
> **本文档覆盖**: 跨 concern 的输入/输出 + 隐式合约
---

## 1. 数据源 (Inputs) 清单

> **按"数据从外部进入 god"的路径分类**

| 来源 | 入口 concern | 数据形态 | 频率 | 验证 |
|---|---|---|---|---|
| URL searchParams | c02 (URL 派生) | `{ requestedCwd, sessionId, sidebarCollapsed }` | mount + 变化 | L02 §1 |
| props from parent | <parent> | <type> | <freq> | <line> |
| localStorage | <concern> | <type> | mount | <key> |
| 内部 hook | <hook> | <type> | <freq> | <line> |
| 浏览器 API | <API> | <type> | <freq> | <line> |
---

## 2. 数据汇 (Outputs) 清单

> **按"数据离开 god"的路径分类**

| 输出 | 出口 concern | 接收方 | 形态 | 验证 |
|---|---|---|---|---|
| `router.replace` | c02, c05, c19 | Next router | URL | L<line> |
| ref 传递 (命令式) | c05, c09, c10 | 子组件 | `<RefType>` | L<line> |
| callback 传递 (声明式) | 多数 | 子组件 | `<Callback>` | <line> |
| localStorage write | <concern> | disk | <key>=<value> | <line> |
| 浏览器 API | <concern> | browser | <type> | <line> |
---

## 3. 跨 concern 流动图

```

graph LR

```text
C1[c01 布局 shell]
C2[c02 URL 派生]
C4[c04 Session 选择]
C5[c05 新 Session 流]
C19[c19 handleSelectSession]
```

```text
URL[URL searchParams]
LS[localStorage]
```

```text
URL -->|initialNavigation| C2
C2 -->|getInitialNavigation| C1
C4 -->|setSelectedSession| C5
C19 -->|setSelectedSession| C4
C19 -->|setSessionKey++| C4
C5 -->|URL replace| URL
C4 -->|write last open| LS
```

```text

**关键观察**:

- c19 (handleSelectSession) 是**最大扇出节点**——切换 session 时清空 6+ 个 concern
- c04 (Session 选择) 是**真正中心**——被几乎所有 concern 引用
- c05/c06/c19 都操作 `sessionKey`——remount ChatWindow 的唯一 key
---

## 4. 隐式合约清单

> **这些合约没在 TypeScript 类型中显式表达,但代码默认遵守。破坏任一条 = 行为 bug**

| 合约 ID | 描述 | 涉及 concern | 验证方式 |
|---|---|---|---|
| **C-1** | <e.g. "selectedSession 切换时,branchTree 必须被清空"> | c19, c10 | 测: 切 session → branch tree = [] |
| **C-2** | <e.g. "URL 替换时,如果 URL 已包含该值,不调 replace"> | c02, c19 | grep: 注释 "Skip router.replace when..." |
| **C-3** | <e.g. "sessionStorage 只在 mount 后读"> | c06 | grep: useLayoutEffect 中读 |
| **C-N** | ... | | |
---

## 5. 持久化边界

> **与 L5 副作用文档交叉**——本节只列**跨 concern 的持久化**;单一 concern 内持久化在 L5

| 持久化对象 | 存储 | 触发生命周期 | 涉及 concern |
|---|---|---|---|
| theme preference | localStorage | mount + system change | (外部 hook) |
| sidebar 宽度 | localStorage | 拖拽 commit 时 | c01 |
| sound enabled | localStorage | toggle 时 | <concern> |
| tab session (last open) | sessionStorage | 切 session 时 | c06 |
| ... | | | |

**重复检测**: 同一 key 在多个 concern 写 = 风险 (详见 L6)
---

## 6. URL 派生边界

| URL 参数 | 类型 | 来源 concern | 消费者 |
|---|---|---|---|
| `?session=<id>` | string | c19 (selectSession) | c02 (read) |
| `?cwd=<path>` | string | c05 (newSession) | c02 (read) |
| `?sidebar=collapsed` | enum | c01 | c02 (read) |
| `?tabOpen=...` | (from lib) | (useLayoutEffect) | c06 (read) |

**重复检测**: 同一 URL 参数在多个 concern 写 = 风险 (详见 L6)
---

## 7. 验证清单 (V-*)

- [ ] **V-1**: `router.replace` 调用位置

```

  grep -nE "router\.replace" <path>.tsx

```text

  **期望**: <N> 处

- [ ] **V-2**: 跨 concern 引用关系 (useState from other concern)

```

  grep -nE "useSessionStore|useNewSessionStore" <path>.tsx  # store 替换后

```text

  **期望**: <N> 处

- [ ] **V-3**: localStorage key 使用清单

```

  grep -nE "localStorage\.(get|set)Item" <path>.tsx

```text

  **期望**: <N> 处
---

## 8. Cross-references

- **Reads from**:
  - `../concerns/c*.md` (各 concern 的输入/输出)
  - `../static/file-metadata.md` (行号)
- **Feeds into**:
  - `../cross-cutting/l6-anti-patterns.md` (重复存储 / 重复 URL 写)
  - `../cross-cutting/l7-implicit-invariants.md` (隐式合约 → 不变量)
  - P2 spec (store action 设计 / module 边界)
- **Verifies with**: §7 全部 V-*

```

---

## 模板要点

- **§3 mermaid 是数据流的"全景"**——其它文档只描述片段,这里是合并视图
- **§4 隐式合约是 L7 的"原材料"**——每条 C-N 几乎都是不变量 I-N
- **§5/§6 重复检测**直接交叉 L6——避免在两个文档里重复
- **本模板与"设计数据流图"不同**——本模板描述**现状**,不画"应该怎么流"
