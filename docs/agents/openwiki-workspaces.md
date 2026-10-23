# OpenWiki 跨仓 Workspace

> 长期约定。**改 workspace 之前先看** [`MEMORY.md §4.1`](../../MEMORY.md) 的决策行。

## 这是什么

`evo` 是一个**命名 wiki workspace**，把以下两个仓库的 OpenWiki 联合在一起：

| Wiki ID | 仓库 | 角色 |
|---|---|---|
| `evo-pi` | `/home/berton/evo-pi` | 主仓库（本仓） |
| `pi-web` | `/home/berton/evo-pi/ref_projects/pi-web` | vendored 参考项目（`@agegr/pi-web@0.12.2`） |

注册位置：**用户级** `~/.openwiki/wiki-workspaces.json`（不入仓；用 `$OPENWIKI_CONFIG_DIR` 可改）。当前两个 wiki 都已经把 `evo` 设为 active workspace。

## 为什么这样做

- `pi-web` 是 vendored 完整 clone，**不是** evo-pi 的子项目。它有自己的 `openwiki/`、自己的 `.claims/`、自己的 `.last-update.json`。
- 把它**纳入 evo-pi 自己的 OpenWiki**（即从 `.openwikiignore` 删除 `ref_projects/`）会污染 evo-pi 的 wiki（Claim `repo://` 路径会指向 vendored 内容，且 pi-web 升级会让所有 Claim 变 stale）。
- 走 `openwiki link` workspace 是 OpenWiki 官方为"一个服务跨多仓"提供的机制：
  - 每个 wiki 仍由各自的 `--init` / `--update` 独立维护
  - agent 搜索时（`openwiki_search` / `openwiki_read`）自动跨 wiki，每条结果带 `wiki` 标识来源
  - 不破坏各自的 Claims、provenance、git history

## 一次性建立后，日常怎么用

- 在 `/home/berton/evo-pi` 内执行 `openwiki workspace current` → 应返回 `evo`。
- 在 `/home/berton/evo-pi/ref_projects/pi-web` 内同理。
- 未来 agent 在本仓内做 `openwiki_search`，结果会**自动**包含 pi-web 的页面，section ref 形如 `architecture/jobs.md#retry-control`。
- 用 `openwiki_read({ root, wiki, page, sections })` 显式读特定 wiki 的特定 page+section（`wiki` 省略时默认当前 wiki）。

## 重新链接（re-link）—— 何时需要

`~/.openwiki/wiki-workspaces.json` **不入仓**。以下情况需要重新建：

- 用户重装系统 / 换机器
- `wiki-workspaces.json` 损坏或被误删
- 把 evo-pi 或 pi-web 移到不同绝对路径
- 添加新 wiki 进 workspace（暂无计划）

### 在交互式终端里重建

```sh
## 1. 在用户级注册中心建 / 改 workspace
cd /home/berton      # 或任何能枚举到两个仓库的祖先目录
openwiki link         # 进入 TUI，命名 workspace 为 evo，选 evo-pi + pi-web

## 2. 在每个仓库里把 evo 设为 active
cd /home/berton/evo-pi && openwiki workspace use evo
cd /home/berton/evo-pi/ref_projects/pi-web && openwiki workspace use evo

## 3. 验证
cd /home/berton/evo-pi && openwiki workspace current   # → evo
cd /home/berton/evo-pi/ref_projects/pi-web && openwiki workspace current   # → evo
```

> **`openwiki link` 需要 TTY**（源码 `dist/cli/link.js` 显式检查 `isTTY`），不能从非交互 shell 启动。如果必须在 agent 里建/改，按 `wiki-workspaces.json` schema 直接写（见下）—— schema 校验逻辑在 `dist/linking/wiki-workspaces.js` 的 `isWikiWorkspaceRegistry`。

### 手动写注册表（仅当 TUI 不可用时）

`~/.openwiki/wiki-workspaces.json` 最小骨架（**至少 2 个 wiki 才能组成 workspace**）：

```json
{
  "version": 1,
  "wikis": [
    { "id": "evo-pi", "name": "evo-pi", "root": "/home/berton/evo-pi" },
    { "id": "pi-web", "name": "pi-web", "root": "/home/berton/evo-pi/ref_projects/pi-web" }
  ],
  "workspaces": [
    { "id": "evo", "name": "evo", "wikis": ["evo-pi", "pi-web"] }
  ],
  "active": [
    { "wiki": "evo-pi",  "workspace": "evo" },
    { "wiki": "pi-web",  "workspace": "evo" }
  ]
}
```

字段约束（`isWikiWorkspaceRegistry` 校验）：

- `wikis[].id` / `workspaces[].id` 必须匹配 `^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$`
- `workspaces[].wikis.length` **≥ 2**
- `wikis[].root` 必须是**canonical absolute path**（`path.normalize(root) === root`），`realpath` 后与登记一致
- `names` 1-80 字符，无终端控制字符

写完后再用 `openwiki workspace use evo` 在两边各跑一次（这会触发注册表重写，确保走标准 `setActiveWikiWorkspace` 路径，权限 `0o600`）。

## 各自 update 流程

两个 wiki **独立 update**。不要在 evo-pi 的 OpenWiki 跑 `--update` 时让 agent 写到 pi-web 的页面，反之亦然。

- **evo-pi 的 wiki 演进**（文档本仓能力、capability、ADR）→ 在 evo-pi 内跑 `openwiki --update`
- **pi-web 上游演进**（pi-web 自己的源码、lib/、proxy.ts、mcp-host 等）→ 在 pi-web 内跑 `openwiki --update`
- pi-web 可以用其自带的 scheduled CI（`examples/openwiki-update.yml`），本仓**不**替它跑 CI

## 红线

- ❌ **不要**从 evo-pi 的 `.openwikiignore` 删除 `ref_projects/`——会把 vendored 内容写进 evo-pi 的 wiki，污染 Claims。
- ❌ **不要**让 evo-pi 的 OpenWiki run 把页面写到 `ref_projects/pi-web/openwiki/`，反之亦然。
- ❌ **不要**手动编辑 `openwiki/.claims/`、`openwiki/.last-update.json`、生成的 `openwiki/.run.json`、page provenance。
- ❌ **不要**把 `~/.openwiki/wiki-workspaces.json` commit 到任何仓库——它是用户级配置。
- ✅ **可以**用 `openwiki link`（TUI）或按本文件"手动写注册表"小节重建。
- ✅ **可以**在 MEMORY.md §4.1 决策表加新行记录 workspace 的演进（如新增 wiki）。
