# 行为规格模板 — `<run>/behaviors.md`

> C3 门会解析本文件的表格：每条行为必须有 `script_id`，且该脚本必须存在于
> `<run>/harness/registry.json`；registry 里也不许有孤儿脚本。
> `表面点` 列填 `surface.json` 里的 ID（C4 的 D2 会让未认领的表面点变红）。

# 行为规格 — <能力>

## 行为清单

| ID | 行为 | 触发 | 预期 | 证据 | script_id | 表面点 |
|---|---|---|---|---|---|---|
| B-001 | 点会话行切换会话 | 点击侧边栏行 | 聊天区切到该会话 | `ref_projects/pi-web/components/AppShell.tsx:841` | s-001 | SF-AS-1a2b3c |
| B-002 | 重复点同一行不重载 | 再次点击同一行 | 不 remount，消息不闪 | `ref_projects/pi-web/components/AppShell.tsx:859` | s-002 | SF-AS-4d5e6f |

## 未覆盖的表面点（应尽量为空）

| 表面点 | 理由 | 去向 |
|---|---|---|
| SF-AS-9z8y7x | pi-web 特有（全局快捷键冲突） | `excluded`（不迁） |

## 与 spec 的关系

- R1：本文件即可，不写 `specs/`
- R2/R3：跨边界流程另写 `specs/F-xxx.md`（端到端链路 + 决策表 + 落点），本文件是索引与验收分母
