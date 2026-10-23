# Issue 跟踪器：GitHub

本仓库的 issue 与规格存放在 GitHub Issues 中。所有操作都使用 `gh` CLI。

## 约定

- **创建 issue**：`gh issue create --title "..." --body "..."`。多行正文使用 heredoc。
- **读取 issue**：`gh issue view <number> --comments`，按需结合 `jq` 过滤评论并获取标签。
- **列出 issue**：`gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'`，按需使用 `--label` 与 `--state` 过滤。
- **评论**：`gh issue comment <number> --body "..."`
- **添加 / 移除标签**：`gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **关闭**：`gh issue close <number> --comment "..."`

仓库信息从 `git remote -v` 推断；在 clone 内执行 `gh` 时会自动识别。

## PR 作为请求来源

**PR 作为请求来源：否。**（若本仓库把外部 PR 当作功能请求，请改为 `yes`；`/triage` 会读取此标志。）

设为 `yes` 时，PR 与 issue 走相同的标签与状态机，使用对应的 `gh pr` 子命令：

- **读取 PR**：`gh pr view <number> --comments`，diff 用 `gh pr diff <number>`。
- **列出待 triage 的外部 PR**：`gh pr list --state open --json number,title,body,labels,author,authorAssociation,comments`，只保留 `authorAssociation` 为 `CONTRIBUTOR`、`FIRST_TIME_CONTRIBUTOR` 或 `NONE` 的项（剔除 `OWNER`/`MEMBER`/`COLLABORATOR`）。
- **评论 / 打标签 / 关闭**：`gh pr comment`、`gh pr edit --add-label`/`--remove-label`、`gh pr close`。

GitHub 的 issue 与 PR 共用一个编号空间，裸 `#42` 可能是其中任一；先用 `gh pr view 42` 探测，必要时回退到 `gh issue view 42`。

## 当某个 skill 说 "publish to the issue tracker"

创建一个 GitHub issue。

## 当某个 skill 说 "fetch the relevant ticket"

执行 `gh issue view <number> --comments`。

## Wayfinding 操作

由 `/wayfinder` 使用。**Map** 是一个 issue，**child** 是其下的 ticket。

- **Map**：一个带 `wayfinder:map` 标签的 issue，正文包含 Notes / Decisions-so-far / Fog。创建：`gh issue create --label wayfinder:map`。
- **Child ticket**：作为 GitHub sub-issue 链接到 map（通过 `gh api` 调用 sub-issues 端点）。如果未启用 sub-issues，则把 child 加入 map 正文的任务列表，并在 child 正文顶部加一行 `Part of #<map>`。标签：`wayfinder:<type>`（`research` / `prototype` / `grilling` / `task`）。一旦 claim 一旦后，ticket 分配给当前执行的开发者。
- **阻塞关系**：使用 GitHub 的 **原生 issue 依赖**（UI 可见）。通过 `gh api --method POST repos/<owner>/<repo>/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>` 添加边；其中 `<blocker-db-id>` 是 blocker 的**数据库 id**（`gh api repos/<owner>/<repo>/issues/<n> --jq .id`，**不是** `#number` 或 `node_id`）。GitHub 通过 `issue_dependencies_summary.blocked_by` 报告仅开放 blocker 的实时状态。无法使用依赖功能时，回退到 child 正文顶部的 `Blocked by: #<n>, #<n>` 行。ticket 在所有 blocker 关闭后解除阻塞。
- **Frontier 查询**：列出 map 的所有开放 child（`gh issue list --state open`，限定到 map 的 sub-issues / 任务列表），剔除有开放 blocker（`issue_dependencies_summary.blocked_by > 0` 或 `Blocked by` 行中仍开放的 issue）或已分配人的项；按顺序第一个胜出。
- **Claim**：`gh issue edit <n> --add-assignee @me`，作为会话的首次写操作。
- **Resolve**：`gh issue comment <n> --body "<answer>"`，然后 `gh issue close <n>`，再向 map 的 Decisions-so-far 追加一条上下文指针（gist + 链接）。
