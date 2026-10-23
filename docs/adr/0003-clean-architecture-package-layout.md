<!-- markdownlint-disable MD024 MD040 MD022 MD031 MD032 MD012 MD037 -->

# ADR 0003：Clean Architecture 包结构（capability-first）

**状态**：已接受
**日期**：2026-10-04

---

## 背景

evo-pi V2 从 pi-web 迁移（~80k LOC）。pi-web 当前所有逻辑在 `components/` + `lib/` + `hooks/` 平铺，**业务逻辑与 UI 高度耦合**—多个god component和god lib file。

V2 必须支持未来 pi extension **不引用 web UI 直接消费业务逻辑**。

## 决策

采用 **Clean Architecture 4 层 + capability-first 包结构**：

```text
packages/core/<capability>/{domain,use-cases,adapters,infrastructures}/
packages/web/   # Next.js + React + shadcn/ui
pi-packages/<extension>/  # pi 扩展（消费 @evo-pi/core）
```

### 关键规则

1. **`core/_shared/`** —— 跨 capability 共享的类型（路径 / IDs / errors）
2. **同 capability 内** —— use cases 直接相互调用
3. **跨 capability 类型** —— 通过 `_shared/`
4. **跨 capability 逻辑** —— **port + adapter 反转**：调用方定义 port，被调用方实现
5. **依赖单向向内** —— `domain` 不依赖任何其他包

### 强制手段

- `pnpm-workspace.yaml` 限制 package 边界
- 每个包 `tsconfig.json` 用 `references` 约束
- CI 脚本扫描非法 import（`adapters/` 不得 import `web/`，`domain/` 不得 import 任何外层）

---

## 备选方案

### A. DDD Bounded Context（更学术）

`packages/{context}/{domain,application,infrastructure}/`

**否定**：术语更抽象，对当前团队学习成本高；capability-first 更直观对应"用户在做什么"。

### B. Feature-sliced（Next.js 推荐）

`app/features/{feature}/` —— Next.js App Router 的 layout。

**否定**：不能跨 Next.js 项目复用；pi extension 无法 import 业务逻辑。

### C. 保留 pi-web 当前的平铺结构 + 仅内部重构

**否定**：god component 不拆 → 业务逻辑与 UI 耦合 → pi extension 无法消费。

---

## 影响

| 维度 | 影响 |
|---|---|
| **包结构** | 从 2 个占位包（foo）→ 4+ capability 包（按需增长） |
| **依赖图** | 单向向内 + capability 间 port 反转 |
| **强制工具** | pnpm workspace + tsconfig references + CI 扫描 |
| **pi extension 接口** | `@evo-pi/core/_shared` + `@evo-pi/core/<capability>/{domain,use-cases}` |
| **学习成本** | 团队需理解 Clean Architecture（但骨架稳定） |

---

## 与现有 ADR 的关系

- **补充** ADR 0002（monorepo package structure）：在双层结构（`packages/` + `pi-packages/`）之上引入 capability 4 层（`domain/use-cases/adapters/infrastructures`）—— ADR 0002 解决"包边界"，本 ADR 解决"包内 capability 4 层"
- **配套** ADR 0004（state management）、ADR 0005（UI component strategy）

## 何时重新评估

- V3 引入 GraphQL / tRPC 等接口层时
- capability 数量 > 20 时（考虑按业务域再分组）

## History

- **2026-10-04**：提议（v2 Clean Architecture 4 层 capability-first 包结构草案）
- **2026-10-06**：已接受
