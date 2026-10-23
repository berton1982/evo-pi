# 设计：三处归宿 + D1–D18 机器门

> 重构的目标是**把难维护的代码变成可维护的高质量代码**，不是"把文件拆小"。
> 所以设计不是可选项，而且设计必须**可校验**——否则文档写完没人读，实现偏了没人发现。

## 1. 为什么设计有三处归宿

一个 god 文件（如壳文件）同时干这些事：容器、布局、跨组件通信、通知、状态编排。
把它们的**设计决策**放在同一处，必然有两个后果：跨能力决策被重复拍板，能力内决策淹没全局规则。

| 归宿 | 回答什么 | 何时 | 产物 |
|---|---|---|---|
| **AD 全局架构**（P2.5） | 组件之间**怎么通信**、通知走哪条通道、状态归谁、错误怎么分类、流式唯一入口、层间禁止边 | 一次，任何能力开工前 | `ARCHITECTURE.md` + `arch/*.md` + `arch/rules.json` |
| **底盘契约**（H0–H3） | zone/token/路由/焦点/快捷键/i18n 命名空间的具体契约 | 一次 | `chassis/*` |
| **能力设计**（C4） | 本能力怎么分解、类/接口/端口签名、协议、状态归属、时序、模式、质量预算 | 每能力一次（按 R 级裁剪） | `design/manifest.json` + `design/*` |

判定归属的硬判据：

- **没有 domain / use-cases 层** → 底盘，不是能力（布局、主题、路由、错误边界、键盘）
- **被所有能力消费** → 底盘或 AD（晚冻结 = 每个能力自己搭一套）
- **有业务规则、有状态编排、有协议** → 能力

例（壳文件横跨三处）：布局/面板/持久化/主题/快捷键/Toast 通道 → **底盘**；
"通知/失效广播走哪条通道" → **AD**；12 个上行回调的编排、重挂载、URL 同步 → **能力**。

## 2. C4 的子步骤（含实施图纸 4 步）

| 子步 | 动作 | 产物 | 判据 |
|---|---|---|---|
| `c4.1` 职责分解 | 表面点 + 行为聚类成原子职责；逐个判容器/展示 | `design/components.md` §1 | 每个职责单一所有者；"一坨不可拆"必须给证据 |
| `c4.2` 接口与端口 | 签名 + 前置后置 + 错误语义 | `design/interfaces.ts` | **写成 TS 骨架，进 tsc**；编译不过 = 设计没定稿 |
| `c4.3` 协议 | 命令/事件/幂等/取消/重试；与冻结契约的 delta | `design/protocols.md` | delta 非空 → 变更单 |
| `c4.4` store 设计 | 每个 state 的唯一 owner + 订阅者 + 生命周期 + 机制 | `components.md` §4 + `dynamics.md` 状态图 | 机制必须来自 AD 枚举 |
| `c4.5` 时序 | 每个跨边界流程一张 | `design/sequences/*.md` | 参与者必须来自 c4.1 |
| `c4.6` 关键取舍与预算 | 症状 → 选了什么 → 被否方案 → 错判成本 | `components.md` §5 + `quality.md` | 症状必须是 `path:line` 或行为 ID |
| `c4.7` 质量预算 | 行数/复杂度/props/渲染/三态/文案，全给数字 | `design/quality.md` | 不许出现"通常/应该/合理/尽量" |
| `c4.10` 实施图纸 | 组件树（parent/props/落点/出处）+ hooks（签名/replaces/usedBy）+ stores（stateRefs） | `design/components.md` + `manifest.components/hooks/stores` | D11 / D12 |
| `c4.11` 源码溯源 | 每个元素的出处是可核对的 god 行段，且与 ownership 归属逐段一致 | `manifest.elements[].sources/lines` | D14 |
| `c4.12` 动态视图 | 序列图（端口必须出现）+ 每个 store 一张状态图 | `design/dynamics.md` | D13 / D17 |
| `c4.13` 最佳实践落地 | 每类实践落到哪个元素、做到什么程度 | `design/components.md` §3.5 | D18 |
| `c4.8` 校验与签字 | 跑 design-gate，逐条送签 | 签字（指纹绑定） | 改动即失效 |

**为什么接口用 TS 骨架**：散文接口可以永远是"大致这样"；类型不能。设计阶段就写出
`interface` 与 `type`，把"接口到底长什么样"从会议室搬进编译器。

## 3. `design/manifest.json` 的结构

设计文档给人读；**机器只读这份 manifest**。散文与 manifest 冲突时以 manifest 为准，
（因为它才是被门的集合运算校验的那份）。

```json
{
  "elements": [
    {
      "id": "D-B-01",
      "kind": "component | use-case | port | adapter | state | hook",
      "name": "SessionOrchestrator",
      "layer": "ui",
      "behaviors": ["B-012"],
      "dependsOn": ["D-U-01"],
      "symptom": "ref_projects/pi-web/components/AppShell.tsx:841"
    }
  ],
  "states": [{ "key": "selectedSessionId", "owner": "D-B-01", "readers": ["D-U-01"], "mechanism": "url" }],
  "ports": [{ "id": "D-P-01", "name": "SessionRepository", "consumers": ["D-U-01"], "methods": ["readContext(id)"] }],
  "protocols": [{ "id": "D-X-01", "kind": "command", "name": "sessions.context", "useCase": "D-U-01", "contractRef": "contracts/wire.md#命令" }],
  "sequences": [{ "id": "S-01", "file": "design/sequences/S-01.md", "participants": ["D-B-01", "D-U-01"] }],
  "patterns": [{ "id": "PT-01", "symptom": "ref_projects/pi-web/components/AppShell.tsx:841", "chosen": "回调上提", "rejected": ["事件总线"], "costIfWrong": "小" }],
  "triStates": [{ "boundary": "session-context", "loading": true, "empty": true, "error": true }],
  "quality": { "maxFileLines": 300, "maxComplexity": 10, "maxProps": 8, "renderBudget": 2, "targets": ["packages/web/src/cap-x"] },
  "surfaces": { "SF-AS-a1b2c3": "D-B-01" },
  "excluded": { "SF-AS-d4e5f6": "pi-web 特有，不迁（理由）" }
}
```

字段省略规则：`kind: "state" | "port"` 的元素不要求代码里出现 `@design` 标注（它们由 store 与接口承载）；
确实要后续做的元素写 `"deferred": true`，但仍需保留在 manifest 里（否则就是隐性设计）。

## 4. D1–D10 判据（决策类）

| 门 | 判据 | 机器怎么判 |
|---|---|---|
| **D1 覆盖闭合** | 每条行为 → ≥1 设计元素；每个元素引用 → 行为存在 | 两个集合双向差集 |
| **D2 表面认领** | `surface.json` 的每个表面点 ∈ `surfaces` ∪ `excluded` | 集合包含 |
| **D3 状态唯一** | 每个 state key 恰好一个条目且 owner 存在 | 计数 + 引用检查 |
| **D4 端口闭合** | port 有消费者与方法；protocol 有 use-case；每个 use-case 至少归属一条协议 | 双向匹配 |
| **D5 时序参与者** | 参与者 ⊆ 元素 ID；文件存在 | 名字匹配 + 文件存在 |
| **D6 依赖方向** | `dependsOn` 无环；只能依赖同层或更低层（按 `arch/rules.json.layerOrder`） | DFS + 层序 |
| **D7 三态齐** | 每个数据边界 loading/empty/error 全为 true | 布尔检查 |
| **D8 模式有据** | 症状是存在的 `path:line` 或行为 ID；有被否方案与错判成本 | 文件存在 + 字段非空 |
| **D9 预算非空** | 三个上限是正数；设计文档无模糊词 | 数值 + 关键词 |
| **D10 与 AD 一致** | state 机制 ∈ AD 枚举；协议有 contractRef | 集合包含 |

### 4.2 实施图纸七门（D11–D18）

D1–D10 判的是"设计决策对不对"，D11–D18 判的是"**这份设计能不能拿来写代码**"——前者全绿仍可能
交出一份没有组件树、没有 hook 签名、没有图、元素凭空出现的设计。

| 门 | 判据 | 机器怎么判 |
|---|---|---|
| **D11 组件树** | 唯一根；parent 存在且无环；`element` 已声明；`file` 在 evo-pi 里（禁 `ref_projects/`）；`props` 是数组；`sources` 非空 | 建图 + DFS 找环 + 前缀检查 |
| **D12 hook/store** | hook：`signature`/`replaces` 必填、`usedBy` 非空且都是已声明组件；store：`stateRefs` ⊆ `states` 且 **owner 必须等于 store.element** | 集合包含 + 归属相等 |
| **D13 图** | mermaid 节点 id 必须已声明（元素/组件/hook/store/**端口**/时序）；非 `sequenceDiagram` ≥2 节点；**每个组件至少出现在一张图**；铺底模板未删即红 | 正则抽 id（`(?<![\w-])((?:[DP]-[A-Z]+-\d+|C-\d+|H-\d+|ST-\d+|S-\d+))(?![\w-])`）+ 集合差 |
| **D14 源码溯源** | `sources` 落在本 god、不超行数（可由 `god`+`lines` 自动拼）；**合并后的行段必须与 ownership 归属逐段相等**；派生元素要 `rationale` + `derivedFrom`（一个 id 或数组） | 行段集合比较（drop 区间跳过） |
| **D15（已删）** | 原「设计原则」门。原则层与 D4/D6/质量门/D8 重复，对实施没有指导力（用户评审结论）——换成 D17（视图）与 D18（最佳实践落地） | — |
| **D16 散文锚点** | 设计文档与 run 根 md 里每个 `path:line` 必须文件存在、行号不越界 | 正则抽锚点 + 行数比较 |
| **D17 视图** | `components.md` 是 UML（classDiagram/flowchart）：组件标 `«container»/«presenter»`、hook 标 `«hook»`、store 标 `«store»`，有 `-->` 依赖与 `..>` 订阅；`dynamics.md` 有 `sequenceDiagram`（端口全出现）+ `stateDiagram` | mermaid 块解析 + 类块型标注 + 闭集比对 |
| **D18 最佳实践** | `components.md` 实践表 ≥6 类、落点是已声明 id、措辞 ≥10 字且带机制词 | 表解析 + 闭集 + 机制词正则 |

三个设计要点：

- **D14 是"设计不许自己编出处"的硬约束**。只查"有 sources"没用（写什么都算）；必须与
  `ownership.md` 的归属逐段对齐——两边不一致，必有一边在编。
- **D13 的正则必须带边界**：早期用 `\b(...)\b`，`P-S-01` 里的 `S-01` 会被当成时序图 id，
  产生假引用 + 假"组件没上图"。
- **D16 的锚点要跨目录解析**：`arch/rules.json` 在 program run 里，不在 capability run 里；解析顺序是 run → program run → 仓库根；
  只查 run 目录会把合法出处判成不存在。

### 4.3 原则 / 约束 / 模式：三者不许互相冒充

试点第一版把四条"架构与契约约束"写进了 `principles[]`（层序、端口返回结果对象、预算、乐观回滚），结果这一层与 D6/D4/质量门/D8 完全重复——**"原则"变成了把别处的门抄一遍**。现在三者分工固定：

| 层 | 内容 | 归宿 | 判据 | 换项目会变吗 |
| --- | --- | --- | --- | --- |
| 架构约束 | 层序、禁止边、机制选型、层名 | `arch/rules.json` + `ARCHITECTURE.md` | D6 / D10 | **会**（技术栈与团队决定） |
| 前端最佳实践 | 容器展示分离、状态就近、三态、竞态、a11y、渲染优化… 及"本能力怎么落地" | `components.md` §3.5 | D18 | 会（随栈变化） |
| 模式 | 某症状下的做法 + 被否方案 + 错判成本 | `patterns.md` | D8 | 不会（但需症状） |

关于 Clean Architecture：**CA 的层名（entities/use-cases/adapters）是后端出身的项目选择，不是通用原则**；唯一能上升为通用原则的是 `DIP`（依赖抽象）。前端强推 CA 名词会把"我不这样分层就是错的"变成教条，所以 `ARCHITECTURE.md` 模板现在明确写"层名由本项目决定，依赖方向错才违规"，并把 `ports` 画成 use-cases 的出边而不是 adapters 的下游。

**原则层为什么被删**：原先的 `principles[]` 写过 KISS/DRY/FailFast/SSOT，但它在实施时没有任何约束力——写代码时不会有人回来看它，门也只能校验措辞。现在把这类内容拆成两半：有症状有取舍的进 `components.md §5 关键取舍`（D8 读 `manifest.patterns`），能落到具体写法的进 `§3.5 前端最佳实践`（D18 查机制词）。架构约束仍在 `arch/rules.json`（D6/D10）。

**D1 + D2 是行为覆盖率真正的落地机制。** 只有 D1 时，"少写几条行为"就能刷满；
加上 D2（表面点必须认领），漏掉的行为会以"未认领的表面点"暴露出来。

## 5. 反过度设计：把红线变成判据

每个新增抽象必须同时满足三条，缺一条就红：

1. **有观察到的症状**：`path:line` 或行为 ID（证明问题真实存在）
2. **有当前或已排期的使用者**：`将来可能`不算
3. **记录被否方案 + 错判成本**：一句话即可，但必须有

抽象预算比：`新增抽象数 : 观察到的症状数 ≤ 1 : 1`，超出需在设计评审逐条解释。

会被 D6/D3 直接抓出的典型过度设计：

- 为对称而拆（A 拆了所以 B 也拆）→ 无症状
- 提前抽 port 但没有第二个实现 → 无使用者
- 把 god 拆成一群等大小类 → 重复 owner / 环

## 6. 质量预算闭环：设计给数字 → C5/C6 卡数字

`design/quality.md` 的数字是**下游门的输入**：

| 预算 | 谁卡 | 判据 |
|---|---|---|
| `maxFileLines` | C5 `quality` | 目标目录内文件行数 |
| `maxComplexity` / `maxProps` | C5（静态分析 / 类型计数） | 超限即红 |
| `renderBudget` | C6（仅 R3） | 会话切换与流式更新的渲染次数 |
| 三态 | C6 | `triStates` 全 true |
| 硬编码文案 | C5 lint | 0 |
| 设计→实现漂移 | C5 `drift` | 代码 `@design` 标注 ↔ manifest 元素 |

漂移的做法：实现时在文件头或函数上方写 `// @design D-B-01`。
反查两个方向——设计里有、代码里没有 = 未实现；代码里有、设计里没有 = **隐性设计**（必须补设计或删代码）。

## 7. R 级裁剪

| 产物/门 | R1 | R2 | R3 |
|---|---|---|---|
| decomposition | 1 段职责表 | ✓ | ✓ + 不可拆理由 |
| interfaces.ts | 签名清单 | ✓ | ✓ |
| protocols | — | delta 表 | ✓ + 幂等/取消/重试 |
| states | 1 张表 | ✓ | ✓ + 生命周期 |
| sequences | — | 跨边界 | 每流程 + 失败路径 |
| patterns | — | 症状 + 成本 | 症状 + 被否 + 成本 |
| quality | 行数上限 + 无硬编码 | ✓ | ✓ + 渲染预算 |
| 设计门 | D2/D3/D8/D9 | +D1/D4/D7/D10 | 全部 |
| 签字 | 免 | 批注 | 签字 |

## 8. 设计评审要问的五个问题

送签前自查（用户评审时也按这五条问）：

1. 每个 state 的真源是不是只有一个？说得出它在哪被写吗？
2. 每个抽象若删掉，哪个症状会回来？
3. 跨边界流程有几条？失败路径画了吗？
4. 通知/失效/流式各只有一条通道吗？第二条从哪来？
5. 质量预算是数字还是形容词？

## 行级三个闭环（v2 曾丢掉的东西）

上一代技能有 `extract-features.mjs` / `build-feature-index.mjs` / `verify-features.mjs`：
把"特性块 ↔ 行区间"绑起来，证明**每个 feature 都有行来源、每行都属于某个 feature**。
v2 用 `behaviors + surface + symbols` 替代时把这条线弄丢了，后果很具体：

- `check-symbols` 只覆盖**声明**（AppShell 1241 个），JSX 子树、effect 体、分支不产生声明
- 于是"每个符号都有归属"可以全绿，而**整段渲染逻辑没迁**
- `drop` 只要在 ownership 里写一句"冗余"就能过（旧门的 `drop` 只查理由非空）

现在用 `check-lines.mjs` 三档把它补回来，逐档递进、逐档可红：

| 档位 | 阶段 | 判据 | 拦住的作弊 |
|---|---|---|---|
| `structure` | C1 | 行区间 `1..N` 无空洞；owner 形如 `D-*`；`drop` 必须在 `cut-list.md` 且理由+影响非空 | 自由文本 owner（"布局"）导致行无法追踪；一句话删掉整段 |
| `bind` | C4 | 每个 owner ∈ `manifest.elements`；每个元素至少被 1 个区间认领 | 元素凭空造（没有行来源）；行归属指向不存在的元素 |
| `landed` | C5 | feature/skeleton 元素的 `landing` 文件存在，且文件内含 `@design <元素ID>` | "设计里有、代码里没有"；落地文件写错位置 |

三者与符号对账的关系是**分工**，不是重复：

- 符号对账回答"每个声明去哪了"（细粒度、只覆盖声明）
- 行级闭合回答"每一行去哪了"（粗粒度、覆盖全部行，但只到区间）
- 表面枚举回答"每个交互面谁负责"（交互粒度）
- 行为对账回答"迁完的行为对不对"（语义粒度）

四者交集为空、并集才等于"没有静默丢失"。

### `landing` 字段

`manifest.elements[].landing` = 该元素在 evo-pi 的实现文件（相对仓库根）。
C5 的 `lines --mode landed` 会：文件存在 → 内容含 `@design <id>` → 才认这一行"有着落"。
`kind: state|port` 不参与行认领（它们是横切概念，行归属体现在别的元素上）。
