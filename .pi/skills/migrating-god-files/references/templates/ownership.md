# 归属模板 — `<run>/ownership.md`

> C1 门会**解析本文件里的行区间**，判定三件事：
> 1. `1..N` 无缝覆盖（无空洞、无重叠）
> 2. **归属列必须是设计元素 ID**（`D-<类>-<序号>`），不是自由文本
> 3. `drop` 的区间必须在 `cut-list.md` 里有同范围条目，且带理由与影响
>
> C4 再加一档：每个 owner 必须是 `design/manifest.json` 里存在的元素，且每个元素至少被 1 个区间认领。
> C5 再加一档：feature/skeleton 元素的 `landing` 文件必须存在，且文件里有 `@design <元素ID>`。
>
> 行号必须写 `L` 前缀（`L120-L260`）；不写 `L` 的数字不会被当行号。

# 归属区间表 — `<god>`

## 1. 归属区间表

| 行区间 | 归属 | 类型 | 依据（读到什么） |
|---|---|---|---|
| L1-L45 | `D-B-01` | feature | 会话选择入口：行点击 → 选会话 |
| L46-L120 | `D-B-02` | skeleton | 布局容器，随骨架先立 |
| L121-L180 | `D-B-03` | infra | 日志与容错，不属任何业务元素 |
| L181-L260 | `pi-web 常量表` | drop | 由 evo-pi 配置中心提供 → 必须同时进 `cut-list.md` |

**合计**：`1-N` 全覆盖（N 取 `state.gods[].lines` 之和）

## 2. 未归属（必须为空）

| 行区间 | 为什么还没归属 | 计划 |
|---|---|---|
| — | — | — |

## 3. 归属统计

| 类型 | 行数 | 元素数 |
|---|---|---|
| feature | | |
| skeleton | | |
| infra | | |
| drop | | |

## 4. 多文件 run 的写法

同一 run 带多个 `--god` 时，按文件分节，每节一张表（每节都必须自己 `1..N` 闭合）：

```text
## 文件：components/AppShell.tsx
## 文件：hooks/useAgentSession.ts
```

覆盖检查逐文件判；`cut-list.md` 的范围列写 `L` 区间即可，不需要带文件名（多文件同名区间时在「原代码」列区分）。

## 5. 校验命令

```sh
S=.pi/skills/migrating-god-files/scripts
node $S/check-lines.mjs --run <run> --mode structure   # C1
node $S/check-lines.mjs --run <run> --mode bind        # C4
node $S/check-lines.mjs --run <run> --mode landed      # C5
```
