# 领域文档

工程 skill 在探索本仓库代码时如何读取领域文档的说明。

## 开始探索前，先读取这些

- 仓库根目录的 **`CONTEXT-MAP.md`**：列出当前仓库的所有 context 与系统级文档入口
- 对**当前主题相关**的每个 context：
  - `<context-root>/CONTEXT.md`（context 内领域词汇表）
  - `<context-root>/docs/adr/`（context 内决策）
- **系统级 ADR**：`docs/adr/`（跨 context 生效的工具链 / 架构决策）

如果以上文件不存在，**静默继续**。不要提示其缺失；也不要在前面主动建议创建。`/domain-modeling` skill（通过 `/grill-with-docs` 与 `/improve-codebase-architecture` 进入）会在术语或决策真正被敲定时按需创建它们。

## 文件结构

多 context 仓库（根目录存在 `CONTEXT-MAP.md`）：

```text
/
├── CONTEXT-MAP.md                    ← root: 列出所有 contexts
├── docs/adr/                         ← 系统级决策
├── packages/                         ← context 1: evo-pi 自有 packages
│   └── <name>/
│       ├── CONTEXT.md                ← context 1 词汇表（按需）
│       └── docs/adr/                 ← context 1 决策（按需）
└── pi-packages/                      ← context 2: pi 生态扩展
    └── <name>/
        ├── CONTEXT.md                ← context 2 词汇表（按需）
        └── docs/adr/                 ← context 2 决策（按需）
```

（单 context 仓库结构：`CONTEXT.md` + `docs/adr/` 都在根目录。本仓库当前不是该布局。）

## 使用 glossary 中的词汇

当输出涉及某个领域概念（出现在 issue 标题、重构建议、假设、测试名中）时，使用**当前 context** 的 `CONTEXT.md` 中定义的术语。不要漂移到 glossary 明确避开的同义词。

如果需要的概念尚未出现在 glossary 中，这就是一个信号：要么你在发明项目不用的语言（重新考虑），要么存在真实的术语缺口（记录下来供 `/domain-modeling` 处理）。

## 标记 ADR 冲突

如果你的输出与现有 ADR 矛盾，要显式指出，而不是悄悄覆盖：

> _与 ADR-0007（事件溯源订单）冲突，但值得重新讨论，因为……_

跨 context 决策冲突时（context 内 ADR vs 系统级 ADR），先列两者再讨论取舍。
