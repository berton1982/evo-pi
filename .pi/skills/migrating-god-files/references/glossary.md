# 术语表 — 一个词只能指一件事

> 技能被试点打过的最多的棍不是"没有门"，而是**同一个词在两处指不同东西**："owner" 四义、"契约" 两义、"证据" 三义。读文档的人以为自己懂了，直到门红了才发现说的是另一件事。这张表是消歧义的唯一权威；门与文档出现下列词时，只允许本表的含义。

## 1. owner（四个不同东西，四个不同词）

| 曾混用的写法 | 现在只用这个词 | 指什么 | 存在哪 | 谁判 |
| --- | --- | --- | --- | --- |
| ownership 表里的 owner | **归属元素**（element id） | 某一**行区间**由哪个设计元素负责 | `ownership.md` 的「归属元素」列 | C1 `lines structure`（必须 `D-[A-Z]-NN`） |
| symbol-map 的 owner | **符号归属** | 某个**符号**由哪个设计元素承接 | `symbol-map.md` 的「归属元素」列 | C1 `symbols`（空值即未对账） |
| manifest.states 的 owner | **状态持有者** | 某个**状态**只有一个持有者（元素 id） | `design/manifest.json` 的 `states[].owner` | D3；D12 要求 store 的 `element` 与它一致 |
| zone 的属主 | **zone 属主** | 界面**区域**归哪个能力 | `ARCHITECTURE.md` 区域表 | D6（禁止边） |
| CHG 的受理人 | **受理人**（by） | 谁批了这次契约变更 | `contract-delta.md` 的 CHG 表 | C2 `contractAlign`/`contractDelta` |

规矩：写"owner"一律不合法，必须写上面五个词之一（`review.md` 与 PR 描述同样适用）。

## 2. 契约（两义）

| 词 | 指什么 | 位置 | 判据 |
| --- | --- | --- | --- |
| **接口契约**（wire/data-format/routes/i18n/design-system/interaction） | 跨端/跨进程的**外部协议**（HTTP 命令、事件、DTO、URL、token 命名） | `<program>/contracts/*.md` + `schema.ts` | P1 门 + C2 `contractInventory`（源码端点 ⊆ 契约） |
| **端口协议**（PR-NN） | 能力内部的**抽象边界**（方法签名、幂等、错误语义） | `<capability>/design/protocols.md` | D4（端口闭合） |

所以："改契约"必须说清是**接口契约**（要 CHG 单 + program run 里改）还是**端口协议**（capability run 里改，D4 重跑）。二者混说的直接后果是：在 capability run 里改 `contracts/wire.md`，其他能力与你分叉。

## 3. 证据（三义）

| 词 | 指什么 | 位置 | 判据 |
| --- | --- | --- | --- |
| **源码证据**（evidence anchor） | `path:line` 或 `path#L1-L20`，证明"我读过这里" | 行为表、设计文档、`symbols-*.md` | D16（散文锚点必须落到真实行）、C3 `behaviors`（每条 ≥1 个） |
| **执行证据**（gate evidence） | 命令 + exit code + 时间 + 输出尾巴 | `gates/<id>.json`（`record-verification` 生成） | `verification` 门（≥1 次运行、全 exit 0、≤N 天） |
| **采集证据**（capture） | 快照/抓包/归一化后的可 diff 数据 | `harness/snapshot/<flow>/` | `parity` 门（C6/X1 与快照 diff） |

"证据不足"这句话没信息量。要说"**源码证据**缺：B-007 没有 `path:line`"，或"**执行证据**缺：C5 没有 `gates/C5.json`"。

## 4. 其他高频词

| 词 | 含义 | 不指 |
| --- | --- | --- |
| **能力**（capability） | 用户可感知的一段纵向功能（C-A…C-H），一个 capability run | 不是一个组件、不是一个文件 |
| **底盘**（chassis） | 布局/面板/持久化/主题/快捷键/错误边界/Toast：无 domain/use-cases，验证结构不变量 | 不是"公共组件库" |
| **god 文件** | `GODS.md` 登记的超大文件（R1/R2/R3） | 不是"任何大文件" |
| **表面点**（surface point） | 从源码抽出的**可交互句柄**（handler/aria/role/command/event/api/hotkey/i18n/url） | 不是"用户故事" |
| **行为**（behavior） | 一条可断言的语义（B-NNN），带源码证据与脚本 id | 不是"功能模块" |
| **设计元素**（element） | `manifest.elements[]` 的一项：组件/use-case/port/value-object | 不是"文件" |
| **门**（gate） | 一次可机器判定的检查（`gates/<id>.json` 或 `check-phase` 的一条断言） | 不是"评审意见" |
| **送签**（signoff） | 人确认设计（`architect|user|maintainer`），记在 `signoffs` | 不是"门通过" |
| **结构绿 / 实现绿** | 绑定闭合 / 测试文件真实存在且通过 | 不是"迁移完成" |
| **cut-list（砍单）** | 明确不迁的区间：范围 + 理由 + 影响 | 不是"TODO 列表" |
| **收割回灌**（C7） | 把能力里的通用件收回底盘/架构，并回写契约 | 不是"重构" |
