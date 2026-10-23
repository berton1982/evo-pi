# AGENTS.md

面向在本仓库中工作的 AI 编码代理的**导航与行为规则**。

**边界**（避免与 `MEMORY.md` 重复）：

- 本文件 = 导航 + 行为规则（agent 视角的"怎么做"）
- **项目知识/状态/约定**见 [`MEMORY.md`](./MEMORY.md)

---

## 必读顺序（任何实际工作前）

1. [`MEMORY.md`](./MEMORY.md) — 项目约定、当前状态、开放问题

具体操作前，按 MEMORY.md §5 索引按需读其他文档。

### 跨会话生效的注释纪律（**先读** [code-comment-hygiene.md](./docs/conventions/code-comment-hygiene.md)）

> **核心原则**：**注释是 AI 驱动开发时的最佳上下文**。
>
> 注释不是装饰——它让下一个开发者（人或 AI agent）能在 30 秒内理解这段代码
> **为什么这样写**，而不必花 30 分钟逆向推导。
>
> **黄金法则**：代码改了，注释必须跟着改。注释与代码不一致 = 误导，比没注释更糟。

具体 6 条 agent 守则见 MEMORY.md §6.2；PR review checklist 在 `docs/conventions/code-comment-hygiene.md`。

**TL;DR**：写代码后，**习惯性**写“为什么这么写”（不写“做了什么”）；commit 前检查注释是否同步；注释变冗余/错误时**主动报告**。

---

## 语言约定

本仓库的文档默认使用**中文**撰写。所有面向人类的说明性文字、标题、注释、ADR、`CONTEXT.md`、issue/PR 正文、对话回应都使用中文。

以下内容保持英文不变（不要翻译）：

- 代码标识符（变量名、函数名、文件名）
- CLI 命令与参数（如 `gh issue create`）
- 标签字符串（`needs-triage`、`ready-for-agent` 等）
- 文件引用与链接

如果某个文件历史上是英文，新内容用中文追加时保持与原文一致；若需整体翻译，请显式说明。

---

## 任务拆解指导原则

### 一次只做一件事

**规则**：拆 ticket / story / task 时，每个单元只承载**一个独立可验证的进展**。把多个独立关注点合并在同一张里是反模式。

**判据**（自检四问，全部"是"才合格）：

1. AC 之间不强依赖（一个 AC 失败不影响另一个的可验证性）
2. 不同 AC 对应不同关注点（不同 tool / 不同层 / 不同人工步骤）
3. 一张 issue 能被新人**一次**性读完 → 验证 → 关闭（不需要跨多次会话跟进）
4. 一个 commit（或一次 squash）即可闭环

**反模式**：

- ❌ "biome + husky/lint-staged + changesets + GitHub Action 一起做"——任意一步卡住，整张无法 verification
- ❌ "初始化 monorepo 工具链"（不拆）——scope 模糊，verification-before-completion 无法对齐
- ❌ 一张 ticket 既改 config、又改 workflow、又改 CI——reviewer 无法独立 approve 各关注点

**适用**：所有触发拆 ticket 的 skill（Matt `to-tickets` / Superpowers `writing-plans` 等）。

**与 vertical slice 的关系（正交）**：

- vertical slice = 端到端可演示（不只是一层一片）
- "一次只做一件事" = ticket 内部**单关注点**
- 一件事可以非 vertical（如纯 config ticket）；一个 vertical slice 可由多张"一件事" ticket 串成

**实操提示**：

- 拆合 quiz 时默认走 N 而不是 1（除非范围确实 ≤ 0.5 天）
- 阻塞关系显式表达：`T_n+1` blocked by `T_n`，而不是把 `T_n+1` 合并到 `T_n` 内

---

## Agent skills

### Issue tracker

Issue 存放在本仓库的 GitHub Issues 中，通过 `gh` CLI 操作。详见 `docs/agents/issue-tracker.md`。

### Triage labels

五个标准角色，标签名等于角色名（`needs-triage`、`needs-info`、`ready-for-agent`、`ready-for-human`、`wontfix`）。详见 `docs/agents/triage-labels.md`。

### Domain docs

多 context 布局：根 `CONTEXT-MAP.md` + 系统级 `docs/adr/` + per-context `CONTEXT.md`。详见 `docs/agents/domain.md`。

---

## 文档指针

完整文档导航见 [`MEMORY.md §5`](./MEMORY.md)——本文件不重复列。

**最高频**：每次工作开始读 `MEMORY.md`；具体操作前按 §5 索引按需展开。

---

## Penpot 设计协作

本项目通过 Penpot MCP 进行设计协作。涉及 Penpot 设计任务时，**先读** [`.pi/penpot.md`](./.pi/penpot.md) **并按其中规则执行**：

- 首个 Penpot 工具调用：`high_level_overview`（无参数）
- 路由请求到 `~/.penpot-ai-kit/skills/penpot-router/SKILL.md`，选择唯一一个 skill 或 workflow 后严格遵循
- 设计文件、token、组件等系统级约定见 `~/.penpot-ai-kit/AGENTS.md` 与 `~/.penpot-ai-kit/shared/`
- 启动本地 Penpot 后端：使用 `~/.pi/agent/skills/start-penpot/SKILL.md`（`podman-compose` 路径）
- 本地 MCP 入口：`http://localhost:9001/mcp/sse`（经前端反向代理，**非** `localhost:4401`）

<!-- OPENWIKI:START -->

## OpenWiki

This repository has a generated `openwiki/` evidence index. It is optional just-in-time context, not required startup reading.

- Do not enumerate, preload, or search wikis at task start. Use retrieval when the user asks for it, when unfamiliar architecture or dependency behavior materially affects the task, or when source inspection leaves an important uncertainty. Stop once the question is grounded.
- When those conditions apply and OpenWiki retrieval tools are available, use `openwiki_search` for just-in-time context and `openwiki_read` for the relevant complete sections. If search returns `workspace_required`, ask which listed workspace to use and retry with its ID.
- Use `openwiki_list_workspaces` or `openwiki_list_wikis` when workspace membership itself needs to be discovered.
- If the retrieval tools are unavailable, read `openwiki/quickstart.md` and follow its links to the relevant pages.
- Treat source code and tests as authoritative. A brief's unknowns and review items are verification gaps, not automatic requirements.
- Prefer the narrowest quiet validation that proves the changed behavior. Preserve complete failure output.

The scheduled OpenWiki GitHub Actions workflow refreshes the repository wiki. Do not hand-edit generated OpenWiki pages unless explicitly asked; prefer updating source code/docs and letting OpenWiki regenerate.

<!-- OPENWIKI:END -->
