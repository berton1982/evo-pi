# COVERAGE-MATRIX.template — 覆盖矩阵模板 (v1.2 新增,防幻觉/遗漏)

> **何时用**: P1 完成后,**跑 `verify-p1-completeness` skill 前**
> **产出大小**: 100-200 行
> **依赖**: L1 (行号) + 源文件
> **被谁用**: `verify-p1-completeness` skill (自动检查覆盖率)
> **核心问题**: 哪些行被**真的读过**?哪些**漏了**?

```markdown
## <God 名> Coverage Matrix

> **写于**: <YYYY-MM-DD>
> **源文件**: `ref_projects/pi-web/components/<File>.tsx`
> **总行数**: <N>
> **本文件被引用于**: `verify-p1-completeness` skill + P1 INDEX §5
---

## 1. 文件分块

> **分块原则**: 每 50-100 行一块,每块 1 句话总结

| 块号 | 行号 | 一句话总结 | 引用 L* 文档 |
|---|---|---|---|
| §1.1 | L1-L<end> | imports + 注释 + Props | L1 §3, INDEX §2 |
| §1.2 | L<start>-L<end> | <e.g. 4 个 helper 注释 + 类型> | L2 c01 |
| §1.3 | L<start>-L<end> | <e.g. c01 主体> | L2 c01 |
| ... | | | |
| §1.N | L<start>-L<end> | <e.g. 末尾 JSX> | INDEX §4 |

**总块数**: <N>
**平均块大小**: <N> 行
---

## 2. 覆盖率统计

| 指标 | 值 | 目标 | 状态 |
|---|---|---|---|
| 总行数 | <N> | — | — |
| 已读块数 | <N> | — | — |
| 块覆盖率 | <pct>% | 100% | ✅ / ⚠ / ❌ |
| 总 L* 文档数 | <N> | — | — |
| 引用 L* 块数 | <N> | <N> (全部) | ✅ / ⚠ / ❌ |
| 引用覆盖率 | <pct>% | 100% | ✅ / ⚠ / ❌ |
| 含"待评估"或"⚠"的块 | <N> | <N> | — |
| L* 文档的 §11 Cross-references 闭合 | <N> / <N> | 100% | ✅ / ⚠ / ❌ |

**判定**:
- 块覆盖率 = 100% 且 引用覆盖率 = 100% → ✅ P1 完成
- 任一 < 100% → ⚠ 需补块或补 L* 文档
- 块覆盖率 < 80% → ❌ 重做 P1
---

## 3. 块详情

### 块 §1.1: imports + Props (L1-L<end>)

**总结**: <一句话>

**已读 L* 引用**:
- L1 §3 (外部依赖)
- INDEX §2 (关注点映射)

**未读项**: 无

**潜在遗漏** (如有,标注 ⚠):
- ⚠ L<line> 注释了 "X" 但未被任何 L* 文档引用 → 可能是隐藏不变量

### 块 §1.2: <e.g. helper type> (L<start>-L<end>)

**总结**: <一句话>

**已读 L* 引用**:
- L2 c01 §<section>

**未读项**: 无

**潜在遗漏**: 无

### ... (其余块)
---

## 4. 跨引用闭合检查

> **每 L* 文档必须在 §"Cross-references" 列出其引用的所有块**

| L* 文档 | 引用块列表 | 完整? |
|---|---|---|
| L1 file-metadata | §1.1, §1.N | ✅ |
| L2 c01 | §1.2, §1.3, §1.4 | ✅ |
| L2 c02 | ... | ✅ |
| ... | | |

**未引用块** (无 L* 文档引用): <N>
- 若是注释 / 空行 / 末尾 → 正常
- 若是代码 → ⚠ 漏读
---

## 5. 幻觉检测 (v1.2 新增)

> **AI 幻觉表现**: 文档说"X 在 L100"但 L100 实际是 Y

**检查方法**: 随机抽 10 个 L* 文档中的行号引用,人工或脚本验证源码

| L* 文档 | 引用 | 实际行内容 | 一致? |
|---|---|---|---|
| L2 c01 | L<line> <claim> | <实际> | ✅ / ❌ |
| L2 c02 | L<line> <claim> | <实际> | ✅ / ❌ |
| ... | | | |

**幻觉率**: <pct>%
- 0% → ✅ 可信
- <5% → ⚠ 局部修正
- ≥5% → ❌ 重做 P1
---

## 6. 自动验证脚本 (v1.2 新增,可选)

> **可写一个 shell 脚本** 跑覆盖率 + 幻觉率检查

```

## !/bin/bash

## scripts/verify-source-study.sh <god>

GOD=$1
FILE=ref_projects/pi-web/components/<File>.tsx
MATRIX=migration-source-code-study/$GOD/coverage-matrix.md

## 1. 抽取 coverage-matrix.md 中的所有引用行号

echo "=== 引用行号 ==="
grep -oE "L[0-9]+(-L[0-9]+)?" $MATRIX | sort -u

## 2. 验证每个引用行号确实在源码中

## 3. 验证 L* 文档的 Cross-references 全部 closed

## 4. 报告覆盖率 + 幻觉率

```text

**集成**: 与 `verify-p1-completeness` skill 联动
---

## 7. Cross-references

- **Reads from**:
  - `../static/file-metadata.md` (L1 行号)
  - 源文件
- **Feeds into**:
  - `verify-p1-completeness` skill (自动检查)
  - `../INDEX.md` §5 验证状态
- **Verifies with**: §2 统计 + §5 幻觉检测
---

## 模板要点 (v1.2)

- **核心问题**: 哪些行被**真的读过**?每个 L* claim 能溯源到具体块吗?
- **§1 分块** 是 P1 必做的"分而读之"工作——避免一次读 445 行
- **§2 覆盖率统计** 是 KPI 量化——AI 可自查
- **§4 跨引用闭合** 防止"写了不引用"或"引用了不写"——闭环可查
- **§5 幻觉检测** 是 v1.2 新增核心机制——AI 容易"自信地错",必须抽查
- **§6 自动脚本** 是未来 ci 化方向,目前手动跑
