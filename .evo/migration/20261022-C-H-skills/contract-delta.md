# 契约对齐 — C-H / `SkillsConfig.tsx`（R1）

> C2 门（`contractAlign` + `contractDelta` + `contractInventory`）判据：本能力用到的每条命令/事件/URL/i18n 键/token 都必须能在冻结契约里指出来；**指不出来就提变更单**，不许默默多用一个。
> 对账口径：源码逐个调用点 → 契约行。数出来的数字都在下面，不是印象。

## 对齐表

| 项 | 本能力用到 | 契约位置 | 状态 |
|---|---|---|---|
| HTTP 命令 | 7 个唯一命令 / 8 个调用点 | `contracts/wire.md:80-88`（`GET /api/skills`、`PATCH /api/skills`、`GET /api/skills/content`、`POST /api/skills/search`、`POST /api/skills/install`、`POST /api/skills/check`、`POST /api/skills/update`） | ✅ 全部在 v0.2 |
| SSE 事件 | 0（本页只读 REST） | `contracts/wire.md` 事件表 | ✅ 不涉及 |
| URL / 深链 | 0 | `contracts/routes.md` | ✅ 不涉及 |
| i18n 键 | 40 个唯一键 / 5 个命名空间（`i18n` 27、`skills` 7、`config` 3、`trust` 2、`common` 1） | `contracts/i18n.md` 命名空间冻结表 | ✅ 5 个命名空间全部已登记 |
| token | 7 个 `var(--x)`：`accent`、`bg-panel`、`border`、`text`、`text-dim`、`text-muted`、**`font-mono`** | `contracts/design-system.md` 色族/字体族表 | 6 个已在；`--font-mono` 缺 → **CHG-001 已提出并应用** |
| 共享原语 | `Config*` 族 25 个（`ConfigCard`/`ConfigRow`/`ConfigSwitch`…） | 底盘 H1（未就绪，见 D-02） | 施工状态，不改契约 |

调用点明细（`grep -n "fetch(" ref_projects/pi-web/components/SkillsConfig.tsx`）：`:660` `GET /api/skills?cwd=`、`:194` `GET /api/skills/content`、`:390` `POST /api/skills/search`、`:417` `POST /api/skills/install`、`:715` `POST /api/skills/check`、`:754` `POST /api/skills/update`、`:796` 与 `:840` 两处 `PATCH /api/skills`（`method: "PATCH"` 在 `:797` / `:841`）。

## 差异与处置

**D-01 · `--font-mono` 未登记**（本能力发现的唯一契约缺口）
- 证据：`SkillsConfig.tsx:450` `fontFamily: "var(--font-mono)"`；契约 `design-system.md` 只有色族与尺寸。
- 处置：**CHG-001**（已在 `contracts/design-system.md` 末尾应用：新增 `--font-mono` + "不许写 `monospace` 字面量"的规矩）。
- 影响：本能力和后续所有需要等宽字体的能力；不涉及 wire 与数据格式，风险低。

**D-02 · 25 个 `Config*` 原语没有契约归属**
- 证据：`SkillsConfig.tsx` 从 `@/components/config/*` 导入 25 个原语，`contracts/design-system.md` 的原语表只覆盖 shadcn 的 16 个。
- 性质：**不是契约缺口，是底盘未就绪**（H1 才会固化这批原语）。本轮不改契约，记录在案。
- 影响：C5 实现时只能"照现状复用"，等 H1 定了归属再统一；写进 `design/components.md` 的"变化出处"。

**D-03 · token 名写法两套并存**（`bg-panel` vs `--color-bg-panel`）
- 证据：契约示例写 `--color-bg-panel`，`globals.css` 实际有 `--bg-panel` 与 `--color-bg-panel` 两种；`SkillsConfig.tsx` 用短名。
- 性质：同样属底盘 H0 的 `CSS-VAR-MAP.md`（H1 产物）。本轮不改契约。
- 影响：认可短名，但迁移时**同一语义只留一个**，由 H1 决定留哪个。

## 本能力用到但契约里没有的

除 D-01（已由 CHG-001 补登记）外没有其它。**没有"用了但没提"的项**：7 个命令、5 个 i18n 命名空间、6 个色/尺寸 token 都能在契约里点到行。

## 变更单

- **CHG-001**：`design-system.md` 新增 `--font-mono`（含"不许写字面量 monospace"的规矩）。状态：已应用。

## 影响评估

| 受影响方 | 影响 | 是否需要回写 |
|---|---|---|
| 本能力 C5 | 等宽字体统一走 `--font-mono` | 否（设计阶段已写入预算） |
| 其它能力 | 用到等宽字体的地方多一条依据 | 否 |
| 底盘 H1 | 需在 `CSS-VAR-MAP.md` 里给出短名/长名映射 | 是（H1 的 C5） |
