# L6-anti-patterns.template — 反模式清单模板

> **何时用**: L2 完成后,识别 god 内的反模式 + 风险
> **产出大小**: 200-500 行
> **依赖**: L2 全部 concern + L5 副作用
> **被谁用**: P2 设计 (明确要消除的反模式) + L7 不变量 (反模式常破坏不变量)

```markdown
## L6 反模式清单

> **写于**: <YYYY-MM-DD>
> **god**: <god 名>
> **本文档覆盖**: god 内的反模式 / 风险 / 已知 bug 根因
---

## 1. 反模式分类总览

| 类别 | 数量 | 严重度 |
|---|---|---|
| 1. imperative ref 跨组件 | <N> | 🔴 高 |
| 2. module-level singleton in hook | <N> | 🔴 高 |
| 3. stale closure workaround | <N> | 🟡 中 |
| 4. 双向 state-ref 同步 | <N> | 🟡 中 |
| 5. useEffect cleanup 缺失 | <N> | 🔴 高 |
| 6. SSR-unsafe storage 访问 | <N> | 🔴 高 |
| 7. prop drill (≥ 5 层) | <N> | 🟡 中 |
| 8. 隐式业务规则散落 | <N> | 🟡 中 |
| 9. 重复 setState (同 key) | <N> | 🟢 低 |
| 10. ... | | |
---

## 2. 反模式详情

### 2.1 imperative ref 跨组件 (命令式数据流)

> **定义**: 父组件通过 useRef 持有子组件实例,直接调子组件方法,绕过 React 数据流

**本 god 中的实例**:

| # | ref 名 | 行 | 调用点 | 子组件 | 严重度 |
|---|---|---|---|---|---|
| 1 | `<name>` | L<line> | L<line> | `<Component>` | 🔴 |
| ... | | | | | |

**每条详述**:
- ref 名称: `<name>`
- 创建位置: L<line>
- 注入子组件位置: L<line>
- 调用位置: L<line>
- 调用的方法: `<methods>`
- **反模式性质**: mutation + 不可见副作用
- **重构方向**: 改 callback prop / 改 store action / 改 context
- **P2 必消除**: 是
---

### 2.2 module-level singleton in hook

> **定义**: hook 内部用 module-level 变量跨实例共享 state,导致多 mount 互相污染

**本 god 中的实例**:

| # | 文件 | 变量 | 用途 | 严重度 |
|---|---|---|---|---|
| 1 | `hooks/<file>.ts` | `<name>` | <e.g. global abort handler> | 🔴 |
| 2 | `hooks/<file>.ts` | `<name>` | theme singleton | 🟡 (useSyncExternalStore 可接受) |

**每条详述**:
- 文件: `<path>`
- 变量: `<name>`
- 用途: <description>
- **测试影响**: 多个测试 mount 时相互污染
- **重构方向**: 改 callback prop / 改 context
---

### 2.3 stale closure workaround

> **定义**: 在 useEffect / useCallback 内用 ref 读最新 state,绕过闭包捕获

**本 god 中的实例**:

| # | ref 名 | 行 | workaround 描述 | 严重度 |
|---|---|---|---|---|
| 1 | `<name>` | L<line> | <e.g. ChatWindow 内部用 soundEnabledRef 包 soundEnabled> | 🟡 |
| ... | | | | |

**重构方向**:
- 改 zustand store (selector 自动获得最新)
- 改 useEvent / useEffectEvent (React 19 提案)
---

### 2.4 双向 state-ref 同步

> **定义**: state + ref 表达同一份数据,需要在每处 setState 后手动同步 ref

**本 god 中的实例**:

| # | state 名 | ref 名 | 同步点 | 严重度 |
|---|---|---|---|---|
| 1 | `sidebarOpen` | `desktopSidebarOpenRef` | L<line> (mobile toggle useEffect) | 🟡 |
| ... | | | | |

**风险**:
- 漏一处同步 → state 与 ref 不一致
- 测试难 (state 改了但 ref 没改)

**重构方向**:
- 去掉 ref,统一 state
- 或: 去掉 state,只保留 ref + 派生 selector
---

### 2.5 useEffect cleanup 缺失

> **定义**: useEffect 设置了订阅 / observer / 定时器,但 return 的 cleanup 函数未正确释放

**本 god 中的实例**:

| # | useEffect 行 | 资源类型 | 缺什么 | 严重度 |
|---|---|---|---|---|
| 1 | L<line> | push subscription | removeEventListener | 🔴 |
| 2 | L<line> | fetch | AbortController | 🔴 |
| 3 | L<line> | MutationObserver | disconnect | 🔴 |
| ... | | | | |

**检测命令**:
```

## 找出 useEffect 没有 return 的

awk '/^  useEffect/,/^  \}, \[/' <path>.tsx | awk '
  /useEffect/ { in_effect=1; has_return=0 }
  /return \(/ { has_return=1 }
  /^  \}, \[/ {
    if (in_effect && !has_return) print NR ": no cleanup"
    in_effect=0
  }
'

```text

**重构方向**:

- 每个 useEffect 必须 return cleanup
- ESLint rule: `react-hooks/exhaustive-deps` 已有 (但只查 deps,不查 cleanup)
---

### 2.6 SSR-unsafe storage 访问

> **定义**: 在 useState initializer / 同步代码中读 localStorage / sessionStorage

**本 god 中的实例**:

| # | 行 | storage | 问题 |
|---|---|---|---|
| 1 | L<line> | sessionStorage | 在 useState lazy init 中读 → SSR 抛 |
| 2 | L<line> | localStorage | 缺 try/catch → 隐私模式抛 |

**已知修复模式** (代码注释明示):
> "sessionStorage is empty during SSR. Applying the tab's remembered session in the useState initializer made the first client tree differ from the server HTML. Restore after mount instead."

**重构方向**:

- 所有 storage 读推迟到 useEffect / useLayoutEffect
- try/catch 包裹
---

### 2.7 prop drill (≥ 5 层)

> **定义**: 父组件把 props 透传给 ≥ 5 层深的子组件,中间组件不消费

**本 god 中的实例**:

| # | prop 名 | 起点 | 终点 | 层数 |
|---|---|---|---|---|
| 1 | `soundEnabled` | AppShell | ChatInput | 3 |
| 2 | `chatInputRef` | AppShell | ChatInput (via ChatWindow) | 3 |
| ... | | | | |

**重构方向**:

- 改 zustand store (consumer 直接 subscribe)
- 改 context (单层)
---

### 2.8 隐式业务规则散落

> **定义**: 业务规则没集中在 1 处,而是散在多个 handler 的 if-else 中

**本 god 中的实例**:

| # | 规则 | 出现位置 |
|---|---|---|
| 1 | "切 project 时关 file tabs" | handleSelectSession L<line>, handleNewSession L<line>, handleCwdChange L<line> (3 处) |
| 2 | "切 session 时清空 branch state" | handleSelectSession L<line>, handleNewSession L<line> (2 处) |
| ... | | |

**风险**:

- 加新 handler 时容易漏
- 改一处忘改其它处

**重构方向**:

- 提 1 个 `useSessionLifecycle` 集中处理
- 或: 用 reducer pattern (single dispatch)
---

## 3. 已知 bug 根因映射

> **从历史 bug 倒推**: 哪些反模式直接导致了已知 bug

| Bug ID | 描述 | 根因 (反模式) | 文档 |
|---|---|---|---|
| Phase 0 bug #2 | 切 session 闪屏 | 2.8 隐式规则 (3 处 setState 顺序错) | handoff §X |
| Phase 0 bug #3 | panel 高度坍缩 | 2.5 cleanup 缺失 (resize observer 未 disconnect) | handoff §X |
| ... | | | |
---

## 4. 反模式 × 重构方向 对照表

> **P2 设计的"必消除"清单**

| 反模式 | 重构方向 | 涉及 concern | 优先级 |
|---|---|---|---|
| 2.1 imperative ref | 改 store action | c05, c09, c10 | P1 |
| 2.2 module-level singleton | 改 callback prop | c20 | P1 |
| 2.3 stale closure | 改 zustand | c04, c10 | P2 |
| 2.4 双向同步 | 去掉 ref | c01 | P2 |
| 2.5 cleanup 缺失 | 补 cleanup | 全部 useEffect | P1 |
| 2.6 SSR-unsafe | 推迟到 useEffect | c06 | P1 |
| 2.7 prop drill | 改 store | c09 | P2 |
| 2.8 隐式规则 | 提 lifecycle hook | c05, c06, c19 | P1 |
---

## 5. 验证清单 (V-*)

- [ ] **V-1**: imperative ref 数量

  ```

## 找出传给子组件的 ref

  grep -nE "ref={|<.*Container.*ref=" <path>.tsx | grep -v "useRef<HTML"

```text

  **期望**: <N> 个 (应与表格一致)

- [ ] **V-2**: module-level let/var

  ```

  grep -nE "^let [a-zA-Z]+:|^var [a-zA-Z]+" hooks/*.ts

```text

  **期望**: <N> 个 (在 hook 文件中)

- [ ] **V-3**: useEffect 无 cleanup

  ```

## 见 §2.5 awk 脚本

```text

  **期望**: <N> 个 (应 = 0 或显式标注原因)

- [ ] **V-4**: 双向 state-ref 同步点

  ```

  grep -nE "\.current = " <path>.tsx | wc -l

```text

  **期望**: 全部 .current 赋值都能找到对应 setState
---

## 6. Cross-references

- **Reads from**:
  - `../concerns/c*.md` §9 反模式
  - `../cross-cutting/l5-side-effects.md` (cleanup 缺失交叉)
- **Feeds into**:
  - P2 spec: "重构必消除"清单
  - `../cross-cutting/l7-implicit-invariants.md` (反模式常破坏的不变量)
  - `../../refactor-patterns.md` (新发现反模式入库)
- **Verifies with**: §5 全部 V-*

```

---

## 模板要点

- **§1 总览表是 P1 质量的"硬指标"**——每个 god 完成后,反模式数应清零(在 P2 之后)
- **§2 每条反模式必须有"重构方向"**——光列反模式不列解法 = 不完整
- **§3 已知 bug 根因映射是 P3 测试设计的依据**——每个 bug 必须有 e2e 永久锁住
- **§4 对照表直接被 P2 spec "必消除清单"消费**
