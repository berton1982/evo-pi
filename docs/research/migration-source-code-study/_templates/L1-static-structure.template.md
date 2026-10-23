# L1-static-structure.template — 静态结构模板

> **何时用**: P1 工作流第一步,读 god 源码前先建立 ground truth
> **产出大小**: 100-300 行
> **依赖**: 无 (起点)
> **被谁用**: L2-L7 全部依赖本文件中的数字
> **v1.1 修订**: 修 3 个 P1 bug(泛型不匹配 / 缩进 2 空格 / 链式 `&&` 短路),详见 `../../CONSTITUTION.md` §5.4

```markdown
## <God 名> 静态结构 (L1)

> **写于**: <YYYY-MM-DD>
> **源文件**: `ref_projects/pi-web/components/<File>.tsx`
> **本文件被引用于**: 所有 L2-L7 文档
---

## 1. 文件元数据

| 项 | 值 | 验证命令 | 实测 |
|---|---|---|---|
| 路径 | `ref_projects/pi-web/components/<File>.tsx` | `ls <path>` | ✅ |
| 总行数 | <N> | `wc -l <path>` | <N> |
| 函数数 (export + 内部) | <N> | `grep -cE "^export function\|^function " <path>` | <N> |
| export 数 | <N> | `grep -cE "^export " <path>` | <N> |
| import 数 | <N> | `grep -cE "^import " <path>` | <N> |
| "use client" 指令 | L<N> 或无 | `grep -nE "^\"use client\"" <path>` | L<N> |
| 最后更新 | <date> | `git log -1 <path>` | <commit> |

**注意**: 总行数每次源码 commit 都可能变,本文件**必须**在每次 L1 触发时重跑。
---

## 2. Hook 计数 (v1.1 修订:用赋值行模式,泛型/缩进鲁棒)

> **关键**: 所有 V-* 命令用 `^[[:space:]]*` 任意缩进 + 优先用赋值行模式(对泛型 `useState<...>(` 鲁棒)
> **参考**: `../../CONSTITUTION.md` §5.4

### 2.1 Assigned hooks (有 `const X = use...` 形式)

| Hook | 出现次数 | 验证命令 (v1.1) | 实测 |
|---|---|---|---|
| `useState` | <N> | `grep -cE "^[[:space:]]*const \[[a-zA-Z_]+, set[A-Za-z]+" <path>` | <N> |
| `useRef` | <N> | `grep -cE "^[[:space:]]*const [a-zA-Z_]+ = useRef" <path>` | <N> |
| `useCallback` | <N> | `grep -cE "^[[:space:]]*const [a-zA-Z_]+ = useCallback" <path>` | <N> |
| `useMemo` | <N> | `grep -cE "^[[:space:]]*const [a-zA-Z_]+ = useMemo" <path>` | <N> |
| `useReducer` | <N> | `grep -cE "^[[:space:]]*const [a-zA-Z_]+ = useReducer" <path>` | <N> |
| `useImperativeHandle` | <N> | `grep -cE "^[[:space:]]*const [a-zA-Z_]+ = useImperativeHandle" <path>` | <N> |
| `useActionState` (React 19) | <N> | `grep -cE "^[[:space:]]*const [a-zA-Z_]+ = useActionState" <path>` | <N> |
| `useOptimistic` (React 19) | <N> | `grep -cE "^[[:space:]]*const [a-zA-Z_]+ = useOptimistic" <path>` | <N> |

### 2.2 Statement hooks (无返回值,直接 `useHook(...)` 调用)

| Hook | 出现次数 | 验证命令 (v1.1) | 实测 |
|---|---|---|---|
| `useEffect` | <N> | `grep -cE "^[[:space:]]*useEffect\(" <path>` | <N> |
| `useLayoutEffect` | <N> | `grep -cE "^[[:space:]]*useLayoutEffect\(" <path>` | <N> |
| `useTransition` | <N> | `grep -cE "^[[:space:]]*useTransition\(" <path>` | <N> |
| `useDeferredValue` | <N> | `grep -cE "^[[:space:]]*useDeferredValue\(" <path>` | <N> |
| `useId` | <N> | `grep -cE "^[[:space:]]*useId\(" <path>` | <N> |
| `useSyncExternalStore` | <N> | `grep -cE "^[[:space:]]*useSyncExternalStore\(" <path>` | <N> |
| `useInsertionEffect` | <N> | `grep -cE "^[[:space:]]*useInsertionEffect\(" <path>` | <N> |

**总 state 槽数**: useState + useRef = <N1> + <N2> = <N3>

**Hook 分类说明**:
- **Assigned hooks**: 必有 1 个赋值行,用 `const X = use[Hook]` 模式计数(对泛型 `useState<...>(` 鲁棒)
- **Statement hooks**: 用 call site 模式,无泛型风险
- **Context hooks** (useContext, use): 较少用,见具体 god
---

## 3. 外部依赖清单

### 3.1 React/Next 内置

| Import | 出现次数 | 用途 |
|---|---|---|
| `useRouter` | <N> | <e.g. router.replace 3 处> |
| `useSearchParams` | <N> | <e.g. URL 派生> |
| ... | | |

### 3.2 自研 hooks (本项目)

| Import | 路径 | 行数 | 用途 |
|---|---|---|---|
| `useTheme` | `hooks/useTheme.ts` | <N> | <用途> |
| ... | | | |

### 3.3 子组件

| Import | 行数 | 父文件传入 props 数 |
|---|---|---|
| `SessionSidebar` | <N> | <N> |
| ... | | |

### 3.4 lib / 工具

| Import | 用途 |
|---|---|
| `lib/initial-navigation` | URL 解析 |
| ... | | |
---

## 4. 段划分 (按行号)

| 段 | 行号区间 | 性质 | 行数 |
|---|---|---|---|
| A. Imports | L<start>-L<end> | import | <N> |
| B. 工具函数 | L<start>-L<end> | helper | <N> |
| C. State body | L<start>-L<end> | useState/useRef/handler | <N> |
| D. return JSX | L<start>-L<end> | JSX | <N> |
---

## 5. 验证清单 (V-*) — v1.1 修订

> **关键**: 所有 V-* 命令用 `^[[:space:]]*` 任意缩进 + 优先用赋值行模式 + **不**用 `&&` 链式
> **参考**: `../../CONSTITUTION.md` §5.4

- [ ] **V-1**: 行数
  ```

  wc -l ref_projects/pi-web/components/<File>.tsx

```text

  **期望**: <N>

- [ ] **V-2**: useState 计数 (赋值行模式,泛型鲁棒)

  ```

  grep -cE "^[[:space:]]*const \[[a-zA-Z_]+, set[A-Za-z]+" ref_projects/pi-web/components/<File>.tsx

```text

  **期望**: <N>

- [ ] **V-3**: useRef 计数 (赋值行模式)

  ```

  grep -cE "^[[:space:]]*const [a-zA-Z_]+ = useRef" ref_projects/pi-web/components/<File>.tsx

```text

  **期望**: <N>

- [ ] **V-4**: useCallback 计数 (赋值行模式)

  ```

  grep -cE "^[[:space:]]*const [a-zA-Z_]+ = useCallback" ref_projects/pi-web/components/<File>.tsx

```text

  **期望**: <N>

- [ ] **V-5**: useEffect + useLayoutEffect 计数 (call site,任意缩进)

  ```

  grep -cE "^[[:space:]]*use(Effect|LayoutEffect)\(" ref_projects/pi-web/components/<File>.tsx

```text

  **期望**: <N>

- [ ] **V-6**: useMemo + useReducer 计数 (赋值行模式)

  ```

  grep -cE "^[[:space:]]*const [a-zA-Z_]+ = use(Memo|Reducer)" ref_projects/pi-web/components/<File>.tsx

```text

  **期望**: <N>

- [ ] **V-7**: React 19 hooks (useActionState + useOptimistic + useTransition + useDeferredValue + useId)

  ```

  grep -cE "^[[:space:]]*(const [a-zA-Z_]+ = use(ActionState|Optimistic)|use(Transition|DeferredValue|Id)\()" ref_projects/pi-web/components/<File>.tsx

```text

  **期望**: <N>

- [ ] **V-8**: 外部 hook import 清单

  ```

  grep -E "^import.*from .hooks/" ref_projects/pi-web/components/<File>.tsx

```text

  **期望**: <N> 行

- [ ] **V-9**: "use client" 指令

  ```

  grep -nE "^\"use client\"" ref_projects/pi-web/components/<File>.tsx

```text

  **期望**: L<1> 或空

- [ ] **V-10**: export 数量

  ```

  grep -cE "^export " ref_projects/pi-web/components/<File>.tsx

```text

  **期望**: <N>
---

## 6. Cross-references

- **Reads from**: 无 (起点)
- **Feeds into**:
  - L2 concerns (使用本文件的行号 + hook 计数)
  - L3 state machines
  - L4 data flow
  - P2 spec (技术栈 / 文件规模)
- **Verifies with**: 全部 V-* 命令

```

---

## 模板要点 (v1.1 修订)

- **§2 计数是 ground truth**——L2-L7 任何"这个 god 有 N 个 state"必须引用本表
- **§5 验证清单是 KPI 复现率计算依据**——L1 必须 ≥ 0.8 复现率
- **每个数字必须可 grep 复现**——人工看数不算
- **v1.1 关键纪律**:
  - 用 `^[[:space:]]*` 不用 `^`(任意缩进,嵌套函数鲁棒)
  - 用赋值行模式 `const [X, setX] = useState`(对泛型 `useState<...>(` 鲁棒)
  - V-* 不链 `&&`(count=0 时不短路第二条)
  - 每条 V-* 都独立可跑、count=0 仍是有效事实
  - **V-1 ~ V-10 全部必须可独立执行**(不依赖前面 V-* 退出码)
