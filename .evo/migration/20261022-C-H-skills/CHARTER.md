# 立项 — C-H / SkillsConfig（技能设置页）

> 本文件由 `state.mjs init --scope capability` 铺底，就地填写（删掉顶部 TODO 横幅）。
> C0 门检查 `## 1. 范围`、`## 2. 基线指纹`（与磁盘一致）、`## 3. 不做清单`。

## 1. 范围

| 项 | 内容 |
|---|---|
| 能力 | **C-H 设置** 的第一块：技能（Skills）设置页 |
| 迁移对象 | `ref_projects/pi-web/components/SkillsConfig.tsx` |
| 用户能做什么 | 看已安装技能（按"活跃/休眠"排序）、按分组批量开关、看单个技能详情（SKILL.md 原文）、搜索并安装市场技能、检查更新并更新 |
| 交付形态 | `packages/web/src/components/settings/skills/*`（展示 + 交互）+ `packages/core/src/skills/*`（排序/锚点/用例）+ `P-S-01..03` 端口 |
| 不包含 | 技能的**安装执行**（复用 pi 的 CLI 安装器，本能力只调端点）、MCP/模型/插件设置（同属 C-H，另起 run） |

## 2. 基线指纹

| 项 | 值 |
|---|---|
| 文件 | `ref_projects/pi-web/components/SkillsConfig.tsx` |
| 行数 | 1089 |
| sha1 | `8f06ea826e7c968a248f383e56ba943f71e0629f` |

指纹由 `state.mjs init` 从磁盘钉取；C0 的 `godFingerprint` 门会重新计算并与 `state.json` 比对。源码动过 → 回 C0 重钉，不许拿旧指纹继续。

## 3. 不做清单

1. **不重写安装逻辑**：安装/更新/检查更新都是调 pi 已有端点（`POST /api/skills/{install,update,check}`），本能力只做"调用 + 状态呈现"。
2. **不改 SKILL.md 格式**：读到什么显示什么，front-matter 解析用 pi 的既有实现，不自己造解析器。
3. **不做权限/信任模型**：项目信任（`trust.`）属于 C-B，本能力只读取信任状态决定是否允许安装。
4. **不动市场协议**：搜索走 `/api/skills/search`，返回字段以 `contracts/data-format.md` 为准，不自造排序规则（排序只用 `orderSkillsByDormancy` 的既有语义）。

## 4. 已知风险

| 风险 | 影响 | 应对 |
|---|---|---|
| pi-web 里 `Config*` 共享原语（25 个）无契约归属 | 直接迁会把底盘实现带进能力 | 只依赖 `components/ui` 与 `components/settings` 的既有原语；缺的先记到 H1 |
| 分组批量开关是"复用单条端点循环"还是"批量端点" | 决定 PR-02 协议形状 | C4 定协议时以行为 B-006 的源码证据为准 |
| 锚点滚动（`#skill-<id>`）与深链 URL 的关系 | 与 C-B 的 URL 同步耦合 | C4 里作为 D-S-03 reducer 的输入，不自己写 URL |
