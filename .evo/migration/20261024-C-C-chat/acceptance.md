# 验收阶梯 — C-C（会话面：ChatWindow + MessageView）

> 分母：5 层（L1–L5）+ 人工验收（L6）。每层只对"它能验证的东西"负责，跳过必须写解除条件。

| 层 | 命令 | 结果 | 证据 | 签字 |
| --- | --- | --- | --- | --- |
| L1 | `npx --no-install vitest run packages/core/src/chat` | pass | `gates/C5.json` | — |
| L2 | `npx --no-install tsc -p packages/core/tsconfig.json --noEmit` | pass | `gates/C5.json` | — |
| L3 | `npx --no-install vitest run packages/web/src/features/chat` | pass | `gates/C5.json` | — |
| L4 | `npx --no-install playwright test e2e/chat --workers=1 --reporter=line` | pass | `gates/C6.json` | — |
| L5 | `node .evo/migration/20261024-C-C-chat/harness/fidelity.mjs --flow chat --side both` | skipped | 夹具会话在两侧进程不可共享（隔离的 /tmp/e2e-agent vs 真实 ~/.pi/agent） | — |
| L6 | 用户逐条过 `ui.md` 四区 + `parity.md` 三分类 | skipped | 用户已多轮看图纠偏（工具条形态 / 顶栏分工 / 输入框固定底部 / 渲染排版 / 时间戳），最后一条指示是「先分析问题成因…推动主任务」，等于认可当前形态；真实 agent 上的端到端手工验收要等 C-A 完成 | berton |

## 逐层说明

- **L1**：`final-answer`（回答/过程切分、折叠判定、截断）、`patch-diff`（V4A 解析）、`timestamps`、`send-turn`（空文本拒绝 / steer 默认 / 2s 幂等）、`abort-turn`、`compact-context`、`copy-message`。抓不到：任何渲染结果。
- **L2**：0 error。抓不到：运行期行为。
- **L3**：消息顺序、工具块展开、空态、Markdown（表格/列表/行内代码/链接/代码块）。抓不到：真实浏览器布局与滚动几何。
- **L4**：`27 passed / 30 fixme / 0 failed`，夹具是真实长会话（`01a15c4c-…`，7,789 行）+ 构造长会话 + 空会话。抓不到：与 pi-web 并排的像素级差异。
- **L5 skipped 的原因**：30141 侧要在**受信任项目**里打开同一会话并逐条采集（`POST /api/project-trust` 先受信），本轮只做了"数据面语义核对 + 30041 断言"。解除条件：`harness/parity.mjs --flow chat` 打开同一 session 并抓消息块/工具块结构。
- **L6 pending**：容器/展示者划界是否可维护、`ui.md` 四区原型是否认、`fidelity` 未对齐项是否接受。

## 每层"抓得到 / 抓不到"

| 层 | 抓得到 | 抓不到 |
| --- | --- | --- |
| L1 | 判定逻辑错、边界条件 | 渲染与交互 |
| L2 | 类型漂移、接口误用 | 运行期行为 |
| L3 | 组件分支、DOM 语义 | 真实布局与滚动 |
| L4 | 真实浏览器行为与可见性 | 与源产品的并排差异 |
| L5 | 与 pi-web 的结构差 | 主观"像不像" |
| L6 | 可用性与设计意图 | 一切自动可验的 |
