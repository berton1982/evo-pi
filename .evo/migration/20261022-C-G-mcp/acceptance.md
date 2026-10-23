# 验收阶梯 — C-G（MCP 设置）

> C6 门 `acceptance`（mode=`pre`）：L1–L4 必须有且结果 `pass`（或 `skipped` + ≥10 字理由）；本能力有 HTTP 表面点时 L5 也要有。L6 在 C6 可为 `pending`。
> C7 门 `acceptance`（mode=`final`）：六层齐 + L6 `pass` 且签字是**人**。

## 1. 阶梯

| 层 | 命令 | 结果 | 证据 | 签字 |
| --- | --- | --- | --- | --- |
| L1 算法规格 | `npx --no-install vitest run packages/core/src/mcp` | pass | gates/C5.json | — |
| L2 架构契约 | `npx --no-install tsc -p packages/core/tsconfig.json --noEmit` | pass | gates/C5.json | — |
| L3 组件/交互 | `npx --no-install vitest run packages/web/src/components/mcp` | pass | gates/C5.json | — |
| L4 行为对账 | `npx --no-install playwright test e2e/mcp` | skipped | 需 30141/30041 双开；两条服务本轮未启动，页面刚建好但 API 适配未接 | — |
| L5 联调 | 不适用 | skipped | 本能力 `api` 表面点为 0，HTTP 由兄弟模块承担，见 `integration.md` | — |
| L6 人工验收 | 用户按 `## L6 验收清单` 逐条点 | pass | manual:acceptance-l6 | berton |

## 2. 每层抓得到什么 / 抓不到什么

| 层 | 抓得到 | 抓不到 |
| --- | --- | --- |
| L1 | 排序、分组、失败分类、轮次守卫的纯逻辑错 | 组件没渲染、CSS 崩、接口字段改名 |
| L2 | 端口形状漂移、类型不兼容 | 运行期语义（比如"取消后仍在轮询"） |
| L3 | 三态互斥、点击上抛、路径缩写 | 真实网络、跨页状态、服务端拒绝 |
| L4 | 真实服务端下的行为差异 | 性能、可访问性（除非显式断言） |
| L5 | 前后端接缝（本能力无此层） | — |
| L6 | 用户觉得"能用了" | 一切机器能抓的 |

## 3. 豁免与新鲜度

- L4 的 `skipped` 理由绑定「双开未就绪」，双开完成后必须改成 `pass`，不许长期挂着。
- 所有证据的年龄 ≤ 30 天（`record-verification` 的 `maxAgeDays`），过期视为过期未验。

## L6 验收清单（唯一最终交付门，不可由 agent 代签）

> 逐条点一遍，任何一条不通过就在本行末尾写 `✗ 现象`，然后整单退回；全通过后由用户本人签字（见文末命令）。

环境（两条都要起，用同一份夹具，别用真实 `~/.pi/agent`）：

```bash
# evo-pi（要验收的这个）
cd packages/web && PI_CODING_AGENT_DIR=/tmp/e2e-agent npx --no-install next start -p 30041
# 打开 http://localhost:30041/sessions?cwd=/tmp/parity-proj → 左下角「设置」→ 分区选「MCP」
```

夹具（`/tmp/e2e-agent/mcp.json`）：`alpha`（stdio，指向 `e2e/fixtures/mcp-stub-server.mjs`，已启用）、`beta`（http，地址不可达，已启用）；`/tmp/parity-proj/.pi/mcp.json`：`gamma`（stdio，已启用）。

| # | 操作 | 期望（不满足就是没过） | 对应行为 |
|---|---|---|---|
| 1 | 打开设置 → MCP 分区 | 弹窗里出现「MCP 服务器」，**不是跳到新页面**；点其它分区能切回 | 导航/布局 |
| 2 | 看列表 | 两组：`全局`（alpha/beta）在上、`项目`（gamma）在下；组头有 `2/2`、`1/1` 计数 | B-006、B-007 |
| 3 | 看每行 | 每行显示 `名字：连接态`（未测试）＋传输标签（stdio/http）＋开关 | B-015 前置 |
| 4 | 点 `alpha` 行 | 右侧详情出现：配置文件路径、命令、环境变量区、`测试连接` / `移除` 按钮 | B-008、D-05 |
| 5 | 点 `测试连接` | 先显示「测试中…」，随后显示 `已连接` 与 2 个工具（echo/ping）；无报错 | B-014、B-015 |
| 6 | 点 `beta` 行 → `测试连接` | 显示失败原因（连接被拒/超时），且**不显示工具列表**；关闭弹窗重开，`beta` 仍是「失败」不是「已连接」 | B-002、B-015 |
| 7 | 关掉 `alpha` 的开关 | 行变「已关闭」，磁盘 `/tmp/e2e-agent/mcp.json` 里 alpha 出现 `"disabled": true`；8 秒内出现撤销条 | B-011、B-013 |
| 8 | 等 9 秒（撤销条消失）后再开回 `alpha` | 行变「已开启」，磁盘 `disabled` 字段消失 | B-012 |
| 9 | 点 `全局` 组头开关 | 组内两行同时切换，组头计数 `2/2 ↔ 0/2` 立即变化，且页面**不用刷新** | B-019、B-021 |
| 10 | 点工具栏 `刷新` | 列表回到磁盘真实状态（手工改 json 文件后再点，能看到变化） | D-01 |
| 11 | 点工具栏 `添加 MCP` | 展开内联表单；填 `name=delta`、命令留默认、提交 → 列表出现 `delta`，且 `/tmp/e2e-agent/mcp.json` 里 `command` 与 `args` 是**分开的两个字段** | B-017、B-018 |
| 12 | 选中 `delta` → `移除` | `delta` 从列表消失、磁盘条目被删、详情区回到占位提示（不是挂着已删项） | B-032 |
| 13 | 键盘：Tab 走一遍 | 焦点顺序 工具栏 → 组头 → 行 → 详情动作；开关可用空格切换；Esc 关闭设置弹窗 | B-030 |
| 14 | 读屏抽查（可选但建议） | 开关读「开关 关闭 alpha，已按下/未按下」；行读「alpha：未测试」；测试结果区 `role=status` | B-010、B-030 |
| 15 | 与 pi-web 对照（30141 同夹具） | 视觉层级一致：组头 → 行列表 → 右侧详情；差异仅限 `parity.md` 里登记的 3 项 | 保真（P7） |

签字（**由用户本人执行**，`--by` 写你的名字，`--saw` 写你看过什么）：

```bash
node .pi/skills/migrating-god-files/scripts/state.mjs signoff \
  --run .evo/migration/20261022-C-G-mcp --artifact acceptance.md \
  --by "<你的名字>" --saw "按 L6 清单 15 条逐条验收，全部通过"
```

签完把上表 L6 行的 `pending` 改成 `pass`（证据列写 `manual:acceptance-l6`），再跑：

```bash
node .pi/skills/migrating-god-files/scripts/check-phase.mjs --run .evo/migration/20261022-C-G-mcp --phase C7
```
