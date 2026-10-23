# 交互契约 — 快捷键 / 焦点 / 通知与失效

> **为什么冻结**：交互是最容易被"顺手优化"掉的一层。迁移中把 Esc 从中止改成关面板、把 Ctrl+Alt+N 改成 Ctrl+N，用户会以为功能丢了。
> **核对**：C6 的 `manual` 行为逐条人工验证并签字；可自动化的用 headless 快照（`harness/snapshot/<flow>/a11y.json`）。

## 1. 全局快捷键（以 pi-web 为准）

| 键 | 作用 | 作用域 | 证据 |
|---|---|---|---|
| `Esc` | 中止当前 agent（无菜单打开时） | 全局（window） | `hooks/useKeyboardShortcuts.ts:73` |
| `Ctrl+Alt+N` | 用当前 cwd 新建会话 | 全局（需 `activeCwd`） | `hooks/useKeyboardShortcuts.ts:78` |

规则：
1. 全局键**先判菜单/弹层**：有弹层时 `Esc` 只关弹层，不中止 agent（`handleGlobalEscape` 负责分发）。
2. 输入框内的普通按键**不触发**全局快捷键（除带修饰键的组合）。
3. 快捷键必须在 UI 里有可发现入口（菜单项显示键位），不做"秘密功能"。

## 2. 焦点与键盘可达

1. 打开弹层：焦点进入弹层首元素；关闭后**回到触发按钮**（不落到 body）。
2. `Tab` 顺序 = 视觉顺序；左中右三区不出现"跳过整区"的陷阱。
3. 消息列表可键盘滚动（`ChatWindow` 容器 `tabIndex=0`），`Home/End` 到首尾。
4. 焦点可见：`focus-visible` ring 不许被 `outline:none` 抹掉。

## 3. 通知与失效广播

| 事件 | 表现 | 谁负责 |
|---|---|---|
| 操作失败 | toast（`role="status"`，错误用 `role="alert"`） | 应用框架（H2）单一 sink |
| 会话被外部修改 | 失效广播 → 相关 query 重取 | H2 广播通道 |
| 跨区原子重置（切 cwd / 切会话） | 一次重置，禁止各 store 各自清 | 能力 C-B 编排 |
| 长任务进行中 | 行内 spinner，不用全屏 loading | 触发器所在组件 |

规则：
1. **通知只有一个 sink**：两个 toast 容器 = 同一条消息弹两次。
2. 同一错误**不重复弹**（3 秒内去重）。
3. `role="status"` 用于非错误（读屏不打断），`role="alert"` 只用于错误。
4. 失效广播不许广播"全表"，必须带范围（`sessions` / `files` / `mcp` / `models`）。

## 4. 输入区约定

1. 草稿按会话持久化（切会话再切回不丢）。
2. `Enter` 发送、`Shift+Enter` 换行、`Esc` 中止（与全局一致）。
3. `@` 提及与 `/` 斜杠命令必须触发补全面板，且键盘可选。
