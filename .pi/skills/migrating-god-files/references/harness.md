# 对账装置：离线快照 + 断言（E2）

> **硬约束**：`MEMORY.md §6.1` 第 8 条——端口 30141 是用户的 pi-web，**绝不触碰**。
> 因此 C6 不允许"连上 30141 驱动它采集"。本文件定义合法路径：**先录快照，再离线断言**。

## 1. 数据流

```
一次性（人工授权窗口 / 已有录制）
  pi-web 30141 ──capture──► harness/snapshot/<flow>/{dom.json,a11y.json,network.json,meta.json}
                                        │
                                        │  （之后完全离线，不再连 30141）
  evo-pi 30041 ──assert───► gates/C6.json（命令 + 退出码）
                                        │
                                        ▼
                              parity.md（人做差异分类）
```

关键点：**期望值来自快照，不来自人手写**。人只做最后一列分类。

## 2. 快照格式

`harness/snapshot/<flow>/`：

| 文件 | 内容 | 归一化要求 |
|---|---|---|
| `dom.json` | 结构锚点树（角色 + 可访问名 + 层级），不是整页 HTML | 去 uuid/时间戳/端口；保留 ≥3 个稳定锚点/区域 |
| `a11y.json` | a11y 树（role/name/state） | 同上 |
| `network.json` | 请求序列（method + path + body 形状，不含正文值） | mask 会话 id、时间戳、token |
| `meta.json` | `{ flow, capturedFrom, capturedAt, toolVersion, notes }` | — |
| `shot.png` | 可选截图，仅供人看 | 不进自动判据 |

`meta.json` 里必须写 `capturedFrom`（哪来的：`pi-web@<sha>` 或 已有录制文件名），
否则快照无法审计。

## 3. 录制纪律

- **一次性**：每个 flow 录一次，之后进 git，不再重录（重录 = 期望值变了，必须走变更单）
- **不碰 live**：录制若必须连 30141，只在用户明确授权的时间窗内进行；`lsof -ti:30141` 只查不 kill
- **不录敏感内容**：network 里只留形状（键 + 类型），不留值
- **可复现**：同样输入两次录制，归一化后 diff 应为空；不为空说明归一化规则不够

## 4. 断言纪律

`assert` 只比三类信号：

| 信号 | 判据 | 为什么 |
|---|---|---|
| wire 调用序列 | path + method + 顺序 | 跨端逻辑错位的第一现场 |
| DOM + a11y 锚点 | 锚点存在性 + 可访问名 + 状态 | 用户可见行为；不锚像素 |
| 截图 | 只作人工看，**不作门** | 像素门会变成噪音门 |

禁止：锚 innerText 全文、锚随机 id、锚绝对坐标、锚动画时序。

## 5. 覆盖不到的行为

无法自动采集的（原生对话框、剪贴板、下载、系统权限）：

1. 在 `behaviors.md` 里写行为行，`script_id` 用 `manual-<n>`
2. 在 `harness/registry.json` 登记 `{ "id": "manual-01", "kind": "manual", "steps": "..." }`
3. C6 的 `parity.md` 必须有该行结果，且由操作者签名

**不许**从对账表里删掉它们。删掉 = 静默放弃覆盖。

## 6. registry 结构

```json
{
  "flows": [
    { "id": "open-session", "status": "captured", "capturedFrom": "pi-web@2026-10-21" },
    { "id": "abort-run", "status": "manual", "reason": "Esc 中止的时序竞态在无头浏览器里不稳定，必须人工验" },
    { "id": "file-preview", "status": "pending" }
  ],
  "scripts": [
    { "id": "s-001", "file": "e2e/flow-open.spec.ts", "kind": "auto", "snapshot": "open-session" },
    { "id": "manual-01", "kind": "manual", "steps": "断网后点刷新，应显示错误态且可重试" }
  ]
}
```

字段判据（`P1:harness` 门按这些判，**不按文件里出现了哪些词**）：

| 字段 | 要求 |
|---|---|
| `flows[].id`（或旧写法 `name`） | 必填，两种写法都认 |
| `flows[].status` | `captured` / `manual` / `pending` 之一 |
| `captured` | 必须有 `snapshot/<id>/{a11y.json,dom.json}` 且非空——否则红 |
| `manual` | 必须有 `reason`（≥10 字），解释为什么不能自动——否则红 |
| `pending` | 允许，但会在门输出里被点名（藏不住） |
| `harness/*.mjs` | 至少一个，且过 `node --check`（语法级可执行） |

> 早先的版本是关键词考勤（文件里出现 `capture`/`assert`/`归一化` 就算过）。
> 试运行时这条门在一个只写了三个词的空壳上通过了——这就是“门禁剧场”，已改掉。

C5 的 `behaviorScripts` 门会检查 `kind: auto` 的 `file` 真实存在。

## 7. 首次落地的顺序

1. P1：定 3–5 个核心 flow（打开会话 / 发送 / 中断 / 切换 / 文件预览）
2. 录快照（用户授权窗口）→ 进 `harness/snapshot/`
3. P2：骨架用快照断言跑通一条真路径
4. 各能力 C6：复用同一套 flow，按 `behaviors.md` 增补

不要一开始就录 40 个 flow——快照也会腐坏（pi-web 一改就过期），先用核心 5 个跑通闭环。
