# 路由与 URL 契约 — 深链必须能直接打开

> **为什么冻结**：evo-pi 换了壳（三区布局 + 新路由），但用户把 `localhost:30141/#/session/<id>` 这类链接发出去后必须还能打开。URL 是外部承诺，不是内部实现细节。
> **核对**：C6 的深链矩阵会把每条 URL 在两边各打开一次，对 `a11y` 快照做对照（`harness/snapshot/<flow>/a11y.json`）。

## 1. 深链矩阵（必须逐条可打开）

| 入口 | 形态 | 打开后必须看到 | 选中态归属 |
|---|---|---|---|
| 会话 | `/?session=<sessionId>` | 该会话完整消息流，滚动到末尾 | `ST` 的 `activeSessionId` |
| 新会话 | `/?new=1` | 空消息区 + 已聚焦输入框 | 无选中 |
| 文件 | `/?session=<id>&file=<path>` | 右侧文件预览打开该文件 | 文件区 `openPath` |
| 设置-模型 | `/?settings=models` | 设置面板停在模型页 | 面板区 `settingsTab` |
| 设置-技能 | `/?settings=skills` | 设置面板停在技能页 | 同上 |
| 设置-MCP | `/?settings=mcp` | MCP 设置页 | 同上 |

## 2. 规则

1. **URL 是派生，不是真源**：选中态由 store 持有，URL 只做双向同步（`popstate` 回填）；禁止把 URL 当唯一状态。
2. **未知 query 必须保留**：不认识的参数不删除、不改写（第三方/未来参数共存）。
3. **深链失败要可见**：会话不存在 → 顶部 toast `session_not_found` 并回列表，不许白屏。
4. **一个 URL 只对应一种布局**：`settings` 与 `file` 同时存在时，文件预览让位（右区只显示一个）。
5. **hash 路由不使用**：evo-pi 用 Next 的 path 路由，pi-web 的 hash 形态只在回流兼容期（如外部分享链接）做一次 301 式跳转。

## 3. 归属

路由同步逻辑属于 **C-B 会话编排**（URL ↔ store 双向），不散落在各页面组件里；设置页的 tab 归属 **C-H 设置** 自己的子路由状态。
