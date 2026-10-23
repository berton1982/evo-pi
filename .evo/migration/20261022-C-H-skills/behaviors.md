# 行为规格 — C-H / `SkillsConfig.tsx`

> 每条行为一行，`证据` 必须是 `path:line`（能点进去看到那行代码）。`script_id` 必须在 `harness/registry.json` 里登记，**双向零孤儿**。
> 证据分级：`实测` = 我读过那段代码并确认分支存在；`未实测` = 从代码推断、尚未跑起来验证（本能力全部为"未实测"，因为 evo-pi 侧还没实现）。

## 行为清单

| ID | 触发 | 预期 | 证据 | script_id |
|---|---|---|---|---|
| B-001 | 打开页面 / `cwd` 变化 | 清空 updateStatuses 与 updateError，重新拉取技能列表 | `ref_projects/pi-web/components/SkillsConfig.tsx:680-684` | s-001 |
| B-002 | 项目信任状态变化（trustKey 变） | 原地重载列表，保留当前选中项与已有更新状态 | `ref_projects/pi-web/components/SkillsConfig.tsx:688-696` | s-002 |
| B-003 | 选中项变化 | 把 `("skills", selected, cwd)` 写进 Settings 的"上次选择" | `ref_projects/pi-web/components/SkillsConfig.tsx:698-701` | s-003 |
| B-004 | 列表请求失败 | 显示错误文本（`error` 字段或 `HTTP <status>`），不渲染半截列表 | `ref_projects/pi-web/components/SkillsConfig.tsx:662` | s-004 |
| B-005 | 技能列表排序 | 按 `orderSkillsByDormancy`：启用且近用者在前，停用者在后 | `ref_projects/pi-web/components/SkillsConfig.tsx:68` | s-005 |
| B-006 | 单个技能开关 | 乐观更新 → `PATCH /api/skills` → 失败回滚 | `ref_projects/pi-web/components/SkillsConfig.tsx:790-796` | s-006 |
| B-007 | 分组批量开关 | 一次 `PATCH /api/skills`（`filePaths[]`）→ 按 `results[]` 逐条回填 | `ref_projects/pi-web/components/SkillsConfig.tsx:830-845` | s-007 |
| B-008 | 打开技能详情 | `GET /api/skills/content?...` 拉 SKILL.md 原文，失败显示可重试错误 | `ref_projects/pi-web/components/SkillsConfig.tsx:194` | s-008 |
| B-009 | 详情内点击锚点链接 | 滚到对应标题节点（不为整页跳转） | `ref_projects/pi-web/components/SkillsConfig.tsx:176` | s-009 |
| B-010 | 加载中 / 出错两态 | 加载显示 `role="status"`，出错显示 `role="alert"`，两者互斥 | `ref_projects/pi-web/components/SkillsConfig.tsx:341` | s-010 |
| B-011 | 市场搜索框输入 | 防抖后 `POST /api/skills/search`，空结果给出"没找到"而非空白 | `ref_projects/pi-web/components/SkillsConfig.tsx:390` | s-011 |
| B-012 | 安装市场技能 | `POST /api/skills/install` → 成功后把新技能并入列表并选中 | `ref_projects/pi-web/components/SkillsConfig.tsx:417` | s-012 |
| B-013 | 单条"检查更新" | `POST /api/skills/check`，只检查该技能，按钮进入 checking | `ref_projects/pi-web/components/SkillsConfig.tsx:715` | s-013 |
| B-014 | "全部检查更新" | 只检查有 `install` 来源的技能（本地技能不发请求） | `ref_projects/pi-web/components/SkillsConfig.tsx:706-712` | s-014 |
| B-015 | 更新技能 | `POST /api/skills/update` → 成功后清该技能的 updateStatus | `ref_projects/pi-web/components/SkillsConfig.tsx:754` | s-015 |
| B-016 | 没有任何技能 | 显示空态引导（选技能/去市场装） | `ref_projects/pi-web/components/SkillsConfig.tsx:1055` | s-016 |
| B-017 | 点"添加技能" | 打开 AddSkillPanel（面板而非跳页） | `ref_projects/pi-web/components/SkillsConfig.tsx:1082` | s-017 |
| B-018 | 关闭安装面板 | 回到技能列表，已安装的出现在列表里 | `ref_projects/pi-web/components/SkillsConfig.tsx:1001` | s-018 |

## 表面点归属（本能力 75 个）

| 类别 | 数量 | 说明 |
|---|---|---|
| i18n | 50 | 每处 `t("...")` 都是文案契约点；40 个唯一键 |
| api | 8 | 7 个唯一命令 / 8 个调用点，见 `contract-delta.md` |
| handler:onClick | 9 | 开关、检查、更新、添加、关闭等 |
| handler:onChange | 4 | 搜索框、下拉选择 |
| role | 2 | `status` / `alert` 两态 |
| handler:onKeyDown | 1 | 详情内的键盘操作 |
| hotkey | 1 | 与全局快捷键的交互（Esc 关闭面板） |

## 未实测声明

本能力在 evo-pi 侧尚未实现（C5 未开工），以上 18 条全部是**读代码得出的规格**，没有一条跑过。C6 对账时必须逐条换成实测证据，否则这 18 条不算交付。
