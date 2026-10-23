# V1 验证 findings — 工作流可靠性评估

> **写于**: 2026-10-12
> **用例**: ProjectTrustDialog (445 行 leaf 组件)
> **目的**: 验证 P1 工作流(7 层 + INDEX)在真实 god 上端到端可用
> **结论**: ✅ **PASS** — 7 层模板全部可填,无阻塞性缺陷,发现 3 个可改进点

## 0. 验证范围

**做了什么**:

1. 选 ProjectTrustDialog 作为 V1 god (445 行,1 useState + 4 useRef + 4 useEffect + 0 useCallback)
2. 端到端跑 P1 全部 7 层 (L1 + L2 + L3 + L4 + L5 + L6 + L7)
3. 每层都**真实 grep 源码**,不靠 01 报告数据搬运
4. 跑全部 V-* 命令验证

**产出**:

- `migration-source-code-study/project-trust-dialog/` 完整 9 文档 (INDEX + L1 + 2 concerns + 1 state machine + 4 cross-cutting)
- 每文档都有实际 V-* 验证

**没做**:

- 没改任何代码
- 没填 AppShell 24 个"待补" — **AppShell 仍是结构占位符**
- 没跑 P2 spec (那是 V1 之后的步骤)

---

## 1. 端到端跑通证据

### 1.1 文件清单 (10 个,1 报告 + 9 P1)

```text
migration-source-code-study/
├── _workflow-validation/
│   └── v1-findings.md                        ← 本文件
└── project-trust-dialog/                     ← V1 god
    ├── INDEX.md
    ├── static/file-metadata.md               ← L1
    ├── concerns/
    │   ├── c01-listing-fetch.md
    │   └── c02-dialog-mount.md
    ├── state-machines/sm-listing.md          ← L3
    └── cross-cutting/
        ├── l4-data-flow.md
        ├── l5-side-effects.md
        ├── l6-anti-patterns.md
        └── l7-implicit-invariants.md         ← L7 (新增重点)
```

### 1.2 复现率 (KPI) — **全部达标**

| 文档 | V-* 数量 | 状态 |
|---|---|---|
| L1 file-metadata | 10 / 10 | 100% ✅ |
| c01 listing fetch | 8 / 8 | 100% ✅ |
| c02 dialog mount | 7 / 7 | 100% ✅ |
| sm-listing | 6 / 6 | 100% ✅ |
| l4 data flow | 5 / 5 | 100% ✅ |
| l5 side effects | 9 / 9 | 100% ✅ |
| l6 anti-patterns | 5 / 5 | 100% ✅ |
| l7 implicit invariants | 5 / 5 | 100% ✅ |
| **总** | **55 / 55** | **100%** ✅ |

**复现率 = 1.0** —— 远超 ≥ 0.8 目标

## 2. 发现的 3 个 P1 工作流问题

### 🔴 P1-A: L1 模板 grep 模式 bug (严重)

**问题**:
原 L1 模板 V-* 使用 `useState\(` 模式。**该模式不匹配泛型调用**:

```typescript
useState<ProjectTrustMcpListing>({ state: "loading" })
//       ↑ 这里不是 `(`,所以 useState\( 不匹配
```

**实测**:

- L1 模板用 `useState\(` 计数: 0 ❌ (实际是 1)
- 实际用 `useState<...>(` 形式: 1 ✅

**同样问题**:

- `useRef\(` 不匹配 `useRef<HTMLDivElement>(...)` 形式
- `useState\(` 不匹配 `useState<...>(...)` 形式
- (但 useEffect, useCallback, useMemo 不带泛型,不受影响)

**修复**:
L1 模板和 CONSTITUTION 的 V-* 命令应改用**赋值行模式**:

```bash
## useState 计数
grep -cE "^[[:space:]]*const \[[a-zA-Z_]+, set[A-Za-z]+" <path>

## useRef 计数
grep -cE "^[[:space:]]*const [a-zA-Z_]+ = useRef" <path>
```

这两个模式基于**赋值语句**,不依赖调用语法,**对泛型鲁棒**。

**优先级**: 🔴 P1 — 必须修复才能保证 L1 数字正确
**已在 V1 中修复**: 见 `project-trust-dialog/static/file-metadata.md` §2

### 🟡 P1-B: L1 模板缩进 bug (中等)

**问题**:
原 L1 模板 `^  const` (固定 2 空格) 不匹配嵌套函数体中的 useRef。

**实测**:

```bash
## 错误版本 (固定 2 空格)
grep -cE "^  const [a-zA-Z_]+ = useRef" <path>
## 输出: 1 (只匹配 L128 顶层)
## 实际: 4 (L128, L193, L195, L196 — L193-L196 在 4 空格函数体内)
```

**修复**:
L1 模板应改用 `^[[:space:]]*` (任意缩进):

```bash
grep -cE "^[[:space:]]*const [a-zA-Z_]+ = useRef" <path>
```

**优先级**: 🟡 P1 — 嵌套函数体内 hook 漏数
**已在 V1 中修复**: 见 `project-trust-dialog/static/file-metadata.md` §5 V-3

### 🟡 P1-C: 链式命令 `&&` 短路 bug (中等)

**问题**:
原 L1 模板示例用 `cmd1 && cmd2` 模式:

```bash
grep -cE "useState\(" <path> && \
grep -nE "useState\(" <path>
```

**实测**:

- `grep -c` 在 count=0 时返回 exit 1
- `&&` 短路后第二条命令不执行
- 实测: 第二条"详情位置"grep 完全没跑

**修复**:
L1 模板和未来 grep 链应改用 `;`:

```bash
grep -cE "useState\(" <path> ; \
grep -nE "useState\(" <path>
```

**优先级**: 🟡 P1 — V-* 验证不完整
**已在 V1 中修复**: 见 V1 实际执行的 grep 命令

## 3. 其它观察 (非阻塞)

### 3.1 L7 模板对小 god 端到端可用 ✅

**证据**:

- 9 条 I-N
- 11 条 C-N
- 7 条 A-N
- 5 条 R-N
- 共 32 条不变量,符合"小 god 应有 < 50 条不变量"的预期范围

**结论**: L7 模板无需调整,直接可填

### 3.2 V1 god 的反模式数为 0 (负面验证) ✅

**证据**: L6 详细审计发现本组件:

- 0 imperative ref 跨组件
- 0 module-level singleton
- 0 双向 state-ref 同步
- 0 useEffect cleanup 缺失
- 0 SSR-unsafe storage
- 0 prop drill ≥ 5 层
- 0 隐式业务规则散落
- 3 处 stale closure workaround (全部合法)

**意义**: P1 工作流**有能力识别"好代码"**——这是负面验证,证明模板不是"为反模式而设计"

**对比**: AppShell (V1 之后做) 应有 5+ imperative ref + 1 module-level singleton + 1 双向同步 + 多处 cleanup 待评估。V1 → V2 (AppShell) 应能揭示"复杂 god 的反模式"

### 3.3 L4 数据流模板在 3-concern god 上"略松" 🟡

**观察**: L4 模板§3 mermaid 数据流图在 ProjectTrustDialog (3 concerns) 上画起来**信息密度低**——大 god (AppShell 20 concerns) 才有真正的"数据流复杂度"

**建议**: L4 模板可加**复杂度自适应**:

- < 5 concerns: mermaid 简化为"父→子"单箭头
- ≥ 5 concerns: 完整 mermaid with 双向边
- ≥ 10 concerns: 拆 main + appendix

**优先级**: 🟢 P3 — 不阻塞,大 god 时再处理

### 3.4 跨组件 L7 引用机制缺失 🔴

**观察**: 本 L7 中 7 条 A-N 假设依赖 AppShell c08 的实现。但**没有机制**强制 AppShell c08 L7 反向引用本 L7。

**风险**: 大 god L7 撰写时容易"漏掉对 leaf 组件的引用",导致 A-N 无主

**建议**: 未来加 `_shared/l7-cross-god-invariants.md` 集中管理跨组件假设

- **优先级**: 🟡 P2 — 重要但不立即阻塞

### 3.5 L1 模板的"段划分"在嵌套函数上不准确 🟢

**观察**: ProjectTrustDialog 有 9 个内部函数,模板的"§4 段划分"只能粗划为 imports / state body / return JSX,实际细分依赖人工

**建议**: 段划分改用"函数划分"而非"行号粗划"——但代价是 V-* 复杂
**优先级**: 🟢 P3 — 文档组织优化,不阻塞

## 4. V1 → V2 决策

### 4.1 V1 是否"通过"?

**通过** ✅ — 7 层模板全部可填,复现率 100%,无阻塞性缺陷

### 4.2 接下来怎么做?

| 选项 | 含义 | 推荐 |
|---|---|---|
| **V1.1: 修模板后重做 V1** | 修复 3 个 P1 模板 bug,然后用修好的模板重做 ProjectTrustDialog | ❌ 不必要(已在 V1 实际填写中应用了修复) |
| **V2: 继续 V1 (ProjectTrustDialog) 的 P2 spec** | 验证 P1 → P2 桥接 | 🟡 可选,价值中等 |
| **V3: 选中等 god 验证** | e.g. BranchNavigator (449 行) 验证"中等 god" 模板适配 | 🟡 可选 |
| **V4: 直接奔 AppShell** | 套 V1 学到的修好的模板,做 AppShell 完整 P1 | ⚠ 风险大,但价值高 |
| **V5: 修订 P1 流程** | 根据 V1 findings 修订 CONSTITUTION + 模板,再继续 | 🟢 推荐 |

### 4.3 我的建议

**先 V5(修订流程),再 V2 或 V4**:

- 把 V1 发现的 3 个 P1 bug 修进 CONSTITUTION 和模板
- 修完后再做 V2 (P2 spec on ProjectTrustDialog) 验证 P1→P2 桥接
- 然后再做 V4 (AppShell 完整 P1)

**不要**:

- 不要直接奔 AppShell——V1 暴露的 3 个 bug 若不修,AppShell 27 个文档会有 27+ 同样 bug
- 不要反复重做 ProjectTrustDialog——V1 已通过,数据已采

---

## 5. P1 流程的 5 个待修项 (按优先级)

| 优先级 | 项 | 位置 | 修复 |
|---|---|---|---|
| 🔴 P1 | L1 grep 模式 bug | CONSTITUTION §5.3 / L1 模板 V-* | 改用赋值行模式 |
| 🟡 P1 | L1 缩进 bug | CONSTITUTION §3.3 / L1 模板 V-* | 改用 `^[[:space:]]*` |
| 🟡 P1 | 链式命令 && bug | CONSTITUTION §5 / L1 模板 V-* | 改用 `;` |
| 🟢 P3 | L4 复杂度自适应 | L4 模板 §3 | 文档加注 |
| 🟡 P2 | 跨组件 L7 引用 | CONSTITUTION §7 / L7 模板 §5 | 新增 `_shared/l7-cross-god-invariants.md` |

---

## 6.5 V5+ 增补 (v1.1 → v1.2 增量)

> **本节补充 V5 + 反思问题 Q1-Q6 后的流程修订**

### 6.5.1 v1.1 修订 (V5)

**3 个 P1 模板 bug 修复**:

- L1 §2 改用 `^[[:space:]]*` 任意缩进
- L1 §5 改用赋值行模式 (`const [X, setX] = useState`) 对泛型鲁棒
- CONSTITUTION §5.4 加 "V-* grep chain discipline" 警告 `&&` 短路

**验证**: V1 已应用修复,ProjectTrustDialog P1 9 文档全部 100% 复现率

### 6.5.2 v1.2 修订 (反思 6 问后)

**新增强化**:

- §8 P1.5 Design Brief 阶段 (500 行硬上限,5+ mermaid 图)
- §9 Design Quality Evaluation (SOLID + 8 个模式 + 10 个反模式)
- §10 L8 技术债务层
- §11 Coverage Matrix (防幻觉/遗漏)
- §12 跨 god 假设 (Linked god)
- §13 01-report 归档策略
- §14 Convention vs Skill 划分

**新模板** (3 个):

- `L8-tech-debt.template.md`
- `DESIGN-BRIEF.template.md` (500 行,5+ mermaid)
- `COVERAGE-MATRIX.template.md`

**新 Skill** (3 个):

- `verify-p1-completeness` (P1 完成后)
- `extract-design-brief` (P1 → P1.5)
- `verify-p2-bridge` (P2 完成后)

**INDEX 模板**:

- 加 §6 Design Quality Scorecard
- 加 §7 Linked god
- 加 §8 P1.5 / P2 / P3 桥接

**L7 模板**:

- 加 "跨 god 假设" subsection (§3.1.3, A-X-N 形式)

**示例填充** (本 v1.2 验证):

- `project-trust-dialog/coverage-matrix.md` (12 块,10/10 幻觉检测)
- `project-trust-dialog/design-brief.md` (~400 行,7 mermaid)
- `branch-navigator/design-brief.md` (~400 行,6 mermaid)
- `project-trust-dialog/INDEX.md` 更新 (加 §6 + §7)
- `branch-navigator/INDEX.md` 更新 (加 §6 + §7)

### 6.5.3 v1.2 验证证据

**ProjectTrustDialog + BranchNavigator 双 god 都用 v1.2 重写**:

- 2 god × 100% V-* 复现率
- 2 god × 12/12 或 11/12 scorecard (clean leaf)
- 2 god × coverage-matrix 100%
- 2 god × design-brief 5+ mermaid 图
- 2 god × L7 跨 god 假设 4 条

**结论**: v1.2 流程在 2 个不同形态 god (网络密集型 vs 渲染密集型) 上都通过

## 7. 对 evo-pi 项目的具体影响

### 7.1 AppShell P1 重新评估

V1 之前,我曾尝试用 V1 之前的模板填 c01-layout-shell.md 作为"示例"。
**该 c01 现在应该废弃**——它基于报告 01 二手数据 + V1 之前模板,**有 L1 模板 bug 的痕迹**(行号 +10 偏移未校正, V-* 命令可能假阳性)。

**建议**: 删除 `migration-source-code-study/app-shell/concerns/c01-layout-shell.md` 和 `l7-implicit-invariants.md`,重新做 AppShell P1 (用 V1 修好的工作流)。

### 6.2 其它 god 顺序建议

| god | 行数 | V1+ 推荐顺序 | 理由 |
|---|---|---|---|
| ProjectTrustDialog | 445 | ✅ 已完成 | V1 用例 |
| BranchNavigator | 449 | 🥈 V2 推荐 | 中等大小,3 concern,有 lock state |
| NewSessionContextBar | 116 | 🥉 V3 备选 | 太小,模板测试不充分 |
| SettingsPanel | 569 | (后做) | 多 modal,跨组件假设多 |
| ChatInput | 2869 | (很后) | 含 streaming state,复杂 |
| AppShell | 2791 | (很后) | 20 concerns,最大 god |
| ChatWindow | 2258 | (很后) | 与 useAgentSession 耦合 |
| MessageView | 2152 | (很后) | 渲染密集 |
| SessionSidebar | 2903 | (很后) | 数据丰富,但体积大 |
| FileViewer | 1897 | (后) | 边界清,但 viewer state 复杂 |

**推荐节奏**:

- V2 = BranchNavigator P1 (验证中等 god 模板适配)
- V3 = AppShell P1 (核心能力,最高价值,但最难)
- V4+ = ChatWindow / MessageView / SessionSidebar / ChatInput (视 V3 经验)

### 6.3 P2/P3 时间预算

V1 用 1 个 god + 1 个 V1 findings 文档,**实际工作量**:

- 9 个 P1 文档: 估算 ~2-3 小时 (含 grep 验证)
- 1 个 V1 findings: ~30 分钟
- 总: 3-4 小时

**外推到其它 god**:

- 中等 god (BranchNavigator 449 行): 3-4 小时
- 大 god (AppShell 2791 行): 估算 8-12 小时 (20 concerns + 5 state machines + 4 cross-cutting)
- 超大 god (SessionSidebar 2903 行): 估算 10-14 小时

**全 P1 完成时间预算**: ~30-50 小时 (5 个主要 god) — **约 1-2 周全职工作**

## 7. 已知遗留 (本 V1 findings)

| 项 | 描述 | 处理 |
|---|---|---|
| ProjectTrustDialog P1 完整 | 9 文档,100% 复现率 | ✅ 暂存,待 P2 时引用 |
| AppShell P1 24 个占位 | 之前"示例"已废弃语义 | 下次清理 |
| 3 个 P1 模板 bug 修复 | 在 V1 实际填写中应用 | 需同步修进 CONSTITUTION + 模板 |
| P2 spec 未做 | P1→P2 桥接未验证 | V2 任务 |
| 跨组件 L7 引用机制 | 缺集中管理 | 建议新增 `_shared/l7-cross-god-invariants.md` |

---

**End of V1 findings.**
