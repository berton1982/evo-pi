# Code Comment Hygiene

> **核心原则**：**注释是 AI 驱动开发时的最佳上下文**。
>
> 注释不是装饰——它让下一个开发者（人或 AI agent）能在 30 秒内理解这段代码
> **为什么这样写**，而不必花 30 分钟逆向推导。

## 为什么注释对 AI 驱动开发尤其重要

人类开发者可以从：

- 经验 / 模式识别（"啊这是 X 模式"）
- 运行代码看效果
- 问同事
- 反复尝试 + 看错误

AI agent 只能从：

- **当前文件内容 + 注释**
- 它自己之前写过的 commit message
- 上下文窗口里能装下的所有东西

**注释是 AI 的"过去对话"**。没有注释，AI 只能逆向推断——慢、错、不一致。

## 什么时候**写**注释

### 1. 设计意图（design intent）—— 最重要

写**为什么**这样写，不是代码做了什么。

```ts
// ❌ 描述代码（重复信息）
// sum a and b
function add(a: number, b: number): number { return a + b }

// ✅ 设计意图（AI 决策上下文）
/**
 * 用 unique symbol 而非字面量 brand 的原因：
 * - 严格性更高：string 不能隐式转 Brand<string, "SessionId">
 * - 独立 module 隔离：不同 package 的 brand 互不冲突
 */
type Brand<T, B extends string> = T & { readonly [__brand]: B }
```

### 2. 反直觉 / 非显而易见的代码

```ts
// ❌ 没人会问为什么
// 过滤空行
const lines = content.split('\n').filter(l => l.length > 0)

// ✅ 解释为什么这样做（避免下次有人"优化"）
/**
 * 跳过空行（trailing newline + blank lines in middle）。
 * pi-coding-agent 的 JSONL 写文件总是以 \n 结尾，split 会多出一个空元素。
 */
```

### 3. 性能 / 安全 / 兼容性 trade-off

```ts
/**
 * T4b MVP：整文件读。
 * pi-web 用 bounded head/tail 是性能优化，T4b 先正确。
 * T4d+ 改进：bounded head/tail read + view cache + stats 计算。
 */
export async function readSessionJsonl(filePath: string): Promise<ReadSessionResult> {
```

### 4. 跨文件 / 跨层契约

```ts
/**
 * pi-sdk 原始 SessionManager 暴露 ~10+ 种方法；这里只列出 port 需要的 3 个。
 * 这样既能让 adapter type-check，又不绑死 SDK API 的形状。
 */
export interface SdkSessionManagerLike { /* ... */ }
```

### 5. 陷阱警告（"不要这样用"）

```ts
/**
 * ⚠️ TS narrowing 对 obj.x 属性访问在 strict 模式下不可靠。
 * 必须先用 guard（isString(obj.x)）再赋值到 typed const。
 */
```

### 6. ADR / issue 引用

```ts
// per ADR 0003 ports-in-independent-package
import type { SessionStorePort } from '@evo-pi/ports'
```

## 什么时候**不**写注释

- 显而易见的代码（`let x = 1`、`const sum = a + b`）
- 仅描述代码做了什么（"sum a and b"）—— 重复信息 = 无价值
- 重复函数名 / 类型名（`// The User class represents a user`）
- 长篇大论（违反"简明扼要"原则）—— 写文档不写代码注释

**判断标准**：注释删掉后，**理解成本是否上升**？

- 是 → 保留
- 否 → 删掉（避免注释噪音）

## 何时**更新**注释

> **黄金法则**：**代码改了，注释必须跟着改**。注释与代码不一致 = 误导，比没注释更糟。

| 触发 | 注释动作 |
|---|---|
| 改了函数签名 / contract | 更新 `@param` / `@returns` / `@throws` |
| 改了算法 / 优化策略 | 更新设计意图段落（"为什么这么做"） |
| 重命名 / 移动文件 | 更新文件级注释的路径引用 |
| 删了某个反模式 | 删除过时的"避免 XX"注释 |
| 修了 bug（根因 + 修复） | 加 1-2 行解释 root cause（防止 regression） |
| 改了依赖方向 / 包结构 | 更新 ADR 引用 |
| 函数变得显然 / 注释变冗余 | **删掉注释** |

## 注释风格约定

- **语言**：中文为主（per AGENTS.md 项目语言约定）；标识符英文
- **长度**：1-3 行（**不写长段落**）；JSDoc `@param` 等 tag 一行一个
- **结构**：第一句"是什么/做什么"；可选第二句"为什么"；可选"何时用"提示
- **JSDoc tags**：`@param` / `@returns` / `@throws` / `@packageDocumentation` / `@example`
- **引用**：ADR 用编号（`per ADR 0003`）；issue 用 `#NNN`；文件用相对路径

## Anti-patterns

| 反模式 | 为什么坏 | 替代 |
|---|---|---|
| ❌ 陈旧注释（代码改了注释没改） | **最严重的反模式**——比没注释更误导 | 每次 PR 必 review；commit message 加 "comments updated" |
| ❌ "做什么"注释 | 重复代码 / 类型签名 | 删掉；如果复杂，加"为什么" |
| ❌ 长篇大论 | 噪音；没人读 | 写 `docs/architecture/`；注释只放代码旁短段落 |
| ❌ TODO 注释 | TODO 应该在 issue tracker；代码里 TODO 会腐烂 | 用 issue：`// TODO(#42):` 三步写 |
| ❌ 注释与代码矛盾 | 比没注释更糟（看似权威但错） | 立即更新；PR review 时关注 |
| ❌ 注释里有个人信息 / 内部笑话 | 维护负担 / 离题 | 删掉 |

## PR Review Checklist（comments）

每次 PR 必须检查：

- [ ] **代码 diff 与注释 diff 同步**——没有只改代码不改注释的情况
- [ ] **注释提到的其他文件 / 函数仍存在**——跨文件引用没断
- [ ] **注释引用的 ADR / issue 仍有效**——数字没变、状态没变
- [ ] **新增复杂逻辑有解释"为什么"**——不只是描述
- [ ] **没有 stale TODO 注释**——要么做掉，要么移到 issue
- [ ] **没有长篇大论**——超 3 行考虑移到独立 doc
- [ ] **跨语言一致性**——中文 doc + 中文注释（除非代码标识符必须英文）

## AI Agent 协作流程

### Agent 写代码时

1. 写代码（先用代码表达意图）
2. 写注释（解释为什么这么写——不是代码做了什么）
3. 自检：删掉注释后，理解成本是否上升？→ 是：保留；否：删

### Agent 修改代码时

1. 读现有注释——避免被过时注释带偏
2. 修改代码
3. **同步修改注释**（PR commit message 加 "comments updated"）
4. 如果代码改而注释没改：agent 必须主动指出"这段代码与注释不一致"

### Agent 启动会话时

- 先读 `MEMORY.md` + `refactor-patterns.md` + 本文件
- 形成"评论质量基线"——后续代码按基线写

## 何时更新本文档

| 触发 | 动作 |
|---|---|
| 出现新的注释反模式 | 加 anti-pattern entry |
| 形成新的注释风格共识 | 加风格条目 |
| 发现 PR review checklist 缺项 | 加 checklist 项 |

## 相关文档

- `docs/conventions/refactor-patterns.md`——具体 entry 记录（PATTERN: Comments as AI context）
- `MEMORY.md`——跨会话工作流纪律（含 comment hygiene 条目）
- `AGENTS.md`——Agent 视角的注释入口
- `docs/conventions/dev.md`——dev 日常约束（lint / format / pre-commit）

---

**版本**：v1.0（2026-09-28 启动）
**触发**：用户反馈 "注释就是 AI 驱动开发时最佳上下文" + 选 D（recurring 流程）
**下次更新**：每次发现反模式或新风格时增量更新
