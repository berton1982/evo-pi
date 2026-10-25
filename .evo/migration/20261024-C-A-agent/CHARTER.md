<!-- TODO-init-scaffold（由 state.mjs init 从 references/templates/CHARTER.md 铺底）
     1. 逐节把占位符换成真实内容（不要留 <...>）
     2. 填完后删掉这段注释——留着的 TODO 就是没做完
-->

# 立项模板 — `20261024-C-A-agent/CHARTER.md`

> 本文件由 `state.mjs init` 铺底到 `.evo/migration/20261024-C-A-agent/CHARTER.md`，就地填写（删掉顶部 TODO）。
> `check-phase.mjs` 会检查 `## 1. 范围` 与 `## 2. 基线指纹` 两节存在，且指纹与磁盘一致。

# 立项 — <迁移名>

> **目录**：`.evo/migration/20261024-C-A-agent/`
> **建档**：`state.mjs init`（指纹由脚本钉，不要手写 sha1）
> **状态**：见 `PROGRESS.md`（自动生成）

## 1. 范围

| # | god | 路径 | 角色（一句话） |
|---|---|---|---|
| 1 | `<God>.tsx` | `<path>` | 壳 / 协调者 / 中枢 / 纯 UI … |

**本 run 不包含**（避免范围蔓延）：

-

**依赖的其它 god**（详细邻居分析在 `neighborhood.md`）：

-

## 2. 基线指纹

> 由 `state.mjs init` 写入，改一行就要重钉。指纹变了 = 源码动过 = 切分表与对账表全部作废。

| 文件 | 行数 | sha1 | 符号全集来源 |
|---|---|---|---|
| `<path>` | 由脚本读取 | 由脚本读取 | 待 S2 填（必须是 LSP） |

## 3. 不做清单

> 写下"这次明确不做"的东西，比写清楚"要做什么"更能防止范围漂移。
> 本节标题与 `C0` 门的 `## 3. 不做清单` 判据一致——模板与门不一致时以门为准并同步改模板。

-

## 4. 验收门

- 每个阶段跑 `check-phase.mjs --run 20261024-C-A-agent`，`exit 0` 才允许 `advance`
- C4 设计签字与 C7 最终验收由**用户**签，agent 不代签
- 硬门与提示项分开记录（提示项不阻塞，见 `references/rules.md §3`）

## 5. 已知风险

| 风险 | 触发条件 | 应对 |
|---|---|---|
| | | |

