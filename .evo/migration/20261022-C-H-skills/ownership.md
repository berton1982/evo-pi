# 归属切分 — `20261022-C-H-skills`

> C1 门 `lines`（structure）：`1..1089` 无缝、无重叠；归属列必须是**设计元素 ID**（`D-<类>-<序号>`），不是自由文本；`drop` 必须在本 run 的 `cut-list.md` 里有同范围条目。
> **为什么按"可命名的职责"切而不是按行数切**：行区间是给对账用的，元素是给实现用的；按 100 行硬切会切出"半个组件"这种谁也说不清的元素。

## 文件：ref_projects/pi-web/components/SkillsConfig.tsx

| 行区间 | 归属 | 类型 | 依据（这一段在做什么） |
|---|---|---|---|
| L1-L50 | D-S-01 | feature | 导入、类型别名（`Skill` 等）与共享常量 |
| L51-L67 | D-U-01 | feature | `SkillScope`/`Translate` 类型 + `sourceLabel`/`scopeLabel`（标签与文案映射） |
| L68-L80 | D-U-02 | feature | `orderSkillsByDormancy`（活跃/休眠排序，纯函数） |
| L81-L96 | D-U-03 | feature | `skillsToSwitch`/`applySkillToggleResults`（批量开关的请求与回填，纯函数） |
| L97-L129 | D-U-04 | feature | `updateKey`/`shortVersion`/`skillInstructionsBody`/`resolveSkillLink`（版本、正文抽取、锚点解析） |
| L130-L355 | D-U-05 | feature | `SkillDetail`（单技能详情卡：版本、锚点滚动、SKILL.md 正文） |
| L356-L625 | D-U-06 | feature | `AddSkillPanel`（市场搜索 + 安装面板） |
| L626-L1089 | D-U-07 | feature | `SkillsConfig`（页面根：加载/分组/批量/检查更新/回锚） |

## 切分说明

1. **1–50 是共享底座**：`Skill` 类型来自 `@/lib/types`，本文件只做导入与三个类型别名。它没有独立行为，归 `D-S-01` 共享值对象，迁到 evo-pi 时并入 `core/skills/domain`，不单独建文件。
2. **68–96 是两个纯函数簇**：`orderSkillsByDormancy` / `skillsToSwitch` / `applySkillToggleResults` 都没有 React 依赖，是可以先写单测的部分（C5 的 TDD 入口）。
3. **97–129 是"文本与链接"四个小工具**：`resolveSkillLink` 直接对应行为 B-009（锚点滚动），`skillInstructionsBody` 对应 B-008（读原文后去 front-matter）。
4. **130–355 与 356–625 是两个可独立成组件的大块**：`SkillDetail`（详情）与 `AddSkillPanel`（市场+安装）。它们各自内部有 fetch，但不共享状态。
5. **626–1089 是页面根**：加载、分组、批量开关、检查更新、空态、锚点回跳都在这里——它是唯一持有"页面级状态"的地方，也是 C4 里 `ST-01` 的 owner。

## 没有 drop

本能力**不砍任何行**：1089 行全部有迁移动机。若 C4 发现某段确实不需要（例如 pi-web 的历史兼容分支），必须在 `cut-list.md` 补条目并写影响，再改本表。
