# Architecture Specs

**用途**：evo-pi architecture 规范集中索引。新建 capability 与现有 module 审计**首先**参考这些规范，然后再写代码。

---

## How to Use This Index

| 如果你是... | 首先读这个 spec |
|---|---|
| **创建新 `core/src/<capability>/` module** | [Architecture 0001](./0001-clean-architecture-4-layer-organization.md) — 4-layer + import 规则 + naming + checklist |
| **创建 web-specific port adapter**（如 `web/src/lib/adapters/`）| [Architecture 0001 §web integration](./0001-clean-architecture-4-layer-organization.md#web-integration) — web 仅依赖 port interface，永远不依赖 concrete impl |
| **为现有 module 做合规审计** | [Architecture 0001 §Verification Checklist](./0001-clean-architecture-4-layer-organization.md#verification-checklist) — 5 个验证命令 |
| **修复 clean architecture violation** | [Architecture 0001 §How to Fix Common Violations](./0001-clean-architecture-4-layer-organization.md#how-to-fix-common-violations) |
| **设计跨包 boundary** | [ADR-0003 clean-architecture-package-layout](../adr/0003-clean-architecture-package-layout.md) — macro architecture（创建哪些包）|
| **做具体架构决策** | `docs/adr/NNNN-*.md` — 单个 ADR（per-capability / per-layer decisions）|

---

## Specs Index

| Number | Title | Status | When to Apply |
|---|---|---|---|
| [Architecture 0001](./0001-clean-architecture-4-layer-organization.md) | Clean Architecture 4-Layer Code Organization（domain + ports-in-domain + use-cases + adapters + infrastructure）| **Accepted (2026-10-07)** | **每个 `core/src/<capability>/` module** + 每个 `web/src/lib/adapters/` module |

---

## Related Documents (per Architecture 0001 §References)

- [ADR-0003 clean-architecture-package-layout](../adr/0003-clean-architecture-package-layout.md) — macro architecture（创建哪些包）
- [Architecture Patterns skill](../../../skills/architecture-patterns/SKILL.md) — Uncle Bob + Hexagonal + DDD 原始 source
- [Clean Architecture (Uncle Bob)](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html) — original 4-layer definition
- [Hexagonal Architecture (Alistair Cockburn)](https://alistair.cockburn.us/hexagonal-architecture/) — Ports and Adapters pattern

---

## Future Specs (lazy, per MEMORY.md §5.4)

- `docs/architecture/web-package.md` — web 包 layer 设计（P1 末）
- `docs/architecture/0002-*.md` — 额外的 architecture specs（按需产出，例如 port-inheritance patterns、error-handling conventions、logging standards）

---

## Maintenance (per verify-before-completion)

添加新 spec 时：

1. 创建 `docs/architecture/NNNN-<topic>.md`（4-digit zero-padded）
2. 添加 entry 到上面的 **Specs Index** 表
3. 如适用，添加 entry 到 **Related Documents**
4. 如是 project-wide spec，从 **MEMORY.md** §5.4 交叉引用
5. 如是 agent-facing，从 **AGENTS.md** Domain docs section 交叉引用
