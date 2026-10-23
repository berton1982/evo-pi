# L8-tech-debt.template — 技术债务与改进建议模板 (v1.2 新增)

> **何时用**: L7 完成后,作为 P1.5 Design Brief 的输入
> **产出大小**: 200-300 行 (含表格)
> **依赖**: L1 (技术栈) + L2-L6 (基础)
> **被谁用**: **P1.5 §11 改进建议**(直接复制) + **P2 spec 决策输入**
> **关键问题**: 当前技术栈缺失什么?推荐什么?**不只"看代码",更要"改代码"**

```markdown
## L8 技术债务与改进建议 — <God 名>

> **写于**: <YYYY-MM-DD>
> **god**: <god 名>
> **本文档核心问题**: 当前 god 的技术栈**欠什么**?推荐什么?
> **重要性**: ⭐⭐⭐⭐ — L7 描述"代码在保护什么",L8 描述"代码在欠什么"
> **L7 vs L8 区别**: L7 是"现状(不能破坏)",L8 是"机会(应该改进)"
---

## 1. 当前技术栈清单 (from L1 §3)

> **本节是"事实"层**——不评价,只列举

| 类别 | 当前 | 状态 | 涉及 L* |
|---|---|---|---|
| **状态管理** | useState + useRef (散落) | 内部 | L1 §2 |
| **数据获取** | fetch + useState + useEffect (n 处) | ⚠ 无 loading/error 抽象 | L5 |
| **列表渲染** | 直接 `.map()` | ⚠ 大列表无虚拟化 | L1 §1 |
| **副作用** | useEffect + cleanup | ✅/⚠ | L5 |
| **路由** | useRouter (next/navigation) | ✅/⚠ | L1 §3 |
| **样式** | inline style / CSS module / Tailwind | <e.g. 50+ inline> | L1 §1 |
| **i18n** | useI18n (t 函数) | ✅ | L1 §3 |
| **测试** | vitest / playwright | <e.g. 0 e2e> | (跨切) |
---

## 2. 缺失/不匹配项

> **本节是"诊断"层**——指出技术栈缺口

| 类别 | 当前 | 缺失 | 建议引入 | 收益 | 风险 |
|---|---|---|---|---|---|
| **数据获取抽象** | fetch + useState + useEffect (n 处) | loading/error/retry 状态机 | **@tanstack/react-query** | 自动 loading/error/retry/cache | 引入 dep + 学习曲线 |
| **列表虚拟化** | 直接 `.map()` | 1000+ 项性能 | **@tanstack/react-virtual** | 1000+ 流畅渲染 | 引入 dep + 高度计算 |
| **跨组件 state** | <N> 个 useState 散落 | 跨组件共享 | **zustand** | 集中 + selector 优化 re-render | 重构量大 + selector 学习 |
| **a11y** | <N> ARIA 属性 | 完整性检查 | **@axe-core/react** (dev) | a11y 回归测试 | 引入 dev dep |
| **错误边界** | 0 显式 error boundary | 组件级隔离 | **react-error-boundary** (或 React 19 内置) | 错误隔离 | React 19 已支持 |
| **CSS-in-JS** | 50+ inline style | 主题切换 + 复用 | **CSS module / Tailwind** | 主题切换 | 重构样式 |
| **表单管理** | 0 表单 (本 god 无) | — | — | — | — |
| **动画** | 0 显式动画 | — | motion / framer-motion | 流畅过渡 | 引入 dep |
| **类型** | inline 推导 + zod (per ADR 0004) | 运行时校验 | **zod** (已用) | 完整 | n/a |
| **日志** | console.log (若用) | 生产级日志 | 自研 logger | 调试 + 监控 | 自研成本 |

**总缺失项**: <N>
---

## 3. 改进建议表 (核心交付)

> **本节是"处方"层**——给出当前 → 推荐的对照

| ID | 当前模式 | 推荐模式 | 收益 | 风险 | 优先级 |
|---|---|---|---|---|---|
| **L8-1** | 5+ 局部 fetch (useState + useEffect) | react-query mutations | 自动 loading/error/retry/cache | 引入 dep | 🔴 P1 |
| **L8-2** | SessionSidebar 列表 1000+ (估计) | @tanstack/react-virtual | 1000+ 流畅 | 引入 dep | 🔴 P1 |
| **L8-3** | <N> 个 useState 散落 (跨组件 state) | zustand store per concern | 集中 + re-render 优化 | 重构量大 | 🟡 P2 |
| **L8-4** | 5 个 imperative ref 跨子组件 | callback prop / store action | 数据流单向 | 改子组件 API | 🟡 P2 |
| **L8-5** | module-level singleton (abort handler) | callback prop | 可测试 | 改 lib | 🟡 P2 |
| **L8-6** | inline style 海量 (50+ 处) | CSS module / Tailwind | 主题切换 | 样式重构 | 🟡 P3 |
| **L8-7** | 双向 state-ref 同步 | 单 state (用 useMemo 派生) | 一致性 | 状态语义重写 | 🟡 P3 |
| **L8-8** | <specific issue> | <recommendation> | <benefit> | <risk> | <priority> |

**优先级判定**:
- 🔴 P1: 数据流正确性 / 用户体验关键
- 🟡 P2: 架构改善 / 可维护性
- 🟢 P3: 风格 / 性能优化
---

## 4. 引入新依赖的成本评估

> **决策辅助**: 每个"建议引入"都应附成本

| 依赖 | 包大小 (gzip) | 学习成本 | 替代方案 | 决策 |
|---|---|---|---|---|
| @tanstack/react-query | ~13KB | 低 (1 天) | SWR / 自研 | (P2 spec 决策) |
| @tanstack/react-virtual | ~5KB | 低 (1 天) | react-window | (P2 spec 决策) |
| zustand | ~3KB | 低 (1 天) | useReducer + context | (P2 spec 决策) |
| ... | | | | |
---

## 5. 改进优先级矩阵

高收益
│
L8-1       │        L8-2
```

   react-query   │     react-virtual
       ★        │           ★
   ─────────────┼──────────────── 高可行性
   ─────────────┼────────────────
       L8-3       │        L8-4

```text
zustand     │    callback props
★        │           ★
│
低收益
```

```text

**左下区(低收益低可行性)**: 🟢 P3 候选
**左上区(高收益低可行性)**: 🟡 P2 候选
**右上区(高收益高可行性)**: 🔴 P1 立即做
**右下区(低收益高可行性)**: 🟡 P2 候选 (改进便宜)
---

## 6. 改进建议的 P1.5 / P2 流向

> **L8 不是孤岛**——它的输出直接流向 P1.5 和 P2

| L8 章节 | 流向 | 用法 |
|---|---|---|
| §2 缺失/不匹配项 | → P1.5 §11 | "改进建议" 表格填充 |
| §3 改进建议表 | → P2 spec 决策章节 | "接受/拒绝 + 理由" |
| §4 引入新依赖成本 | → P2 spec 决策章节 | 成本/收益对比 |
| §5 优先级矩阵 | → P3 plan 任务排序 | 哪些 task 先做 |

**L8 缺失 = P1.5/P2 缺输入**——L8 必须先做
---

## 7. 验证清单 (V-*)

- [ ] **V-1**: 当前技术栈清单完整 (从 L1 抽取)
- [ ] **V-2**: 缺失项每条标注"建议引入" + 收益 + 风险
- [ ] **V-3**: 改进建议表每行有当前/推荐/收益/风险/优先级
- [ ] **V-4**: 引入新依赖有成本评估 (§4)
- [ ] **V-5**: §5 优先级矩阵可视化
- [ ] **V-6**: §6 L8→P1.5/P2 流向明确
---

## 8. Cross-references

- **Reads from**:
  - `../static/file-metadata.md` (L1 §3 外部依赖)
  - `../concerns/c*.md` (各 concern 涉及的技术)
  - `../cross-cutting/l5-side-effects.md` (当前副作用模式)
  - `../cross-cutting/l6-anti-patterns.md` (反模式 → 改进方向)
- **Feeds into**:
  - **P1.5 Design Brief §11 改进建议** (直接复制 §3)
  - **P2 spec "决策" 章节** (引用 §3 + §4)
  - **P3 plan 任务排序** (引用 §5 优先级矩阵)
- **Verifies with**: §7 全部 V-*
```

---

## 模板要点 (v1.2)

- **L7 vs L8 区别是 L8 模板的核心**:
  - L7 = 现状不能破坏(不变量)
  - L8 = 现状应该改进(技术债务)
- **§2 缺失/不匹配** 不是"我觉得缺",而是"业务需求与当前栈不匹配"
- **§3 改进建议表** 必须有"当前/推荐/收益/风险/优先级"5 列,不能只说"建议引入 X"
- **§4 成本评估** 避免"建议引入"成空话——必须有量化成本
- **§5 优先级矩阵** 把"哪些 P1 哪些 P3"可视化,避免"全部 P1"的陷阱
- **§6 流向** 让 L8 真正"流向" P1.5 + P2,而不是孤立文档
