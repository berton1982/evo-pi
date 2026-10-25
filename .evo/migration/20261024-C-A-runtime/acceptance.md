# 验收 — `20261024-C-A-runtime/acceptance.md`

> C6/C7 门 `acceptance` 检查六层阶梯。本能力是运行时（无界面），L4/L5 按"不适用"写明理由。

| 层 | 命令 | 结果 | 证据 |
|---|---|---|---|
| L1 | `npx --no-install vitest run packages/core/src/agent/domain` | pass | gates/C5.json |
| L2 | `npx --no-install vitest run packages/core/src/agent/use-cases` | pass | gates/C5.json |
| L3 | `npx --no-install vitest run packages/core/src/agent` | pass | gates/C6.json |
| L4 | `npx playwright test e2e/c-a-runtime` | pass | gates/C6.json |
| L5 | — | skipped | 本能力无界面，见 design/ui.md 的「不适用」 |
| L6 | 人工 | pending | 待人工逐条验收（L4 已可跑：`e2e/c-a-runtime` 12 passed） |

## 每层抓得到 / 抓不到什么

| 层 | 抓得到 | 抓不到 |
|---|---|---|
| L1 | 事件归约、消息键、状态机边界的错 | 端口契约是否被正确实现 |
| L2 | 准入/排队/幂等/降级的错 | 真实传输行为（顺序、丢包） |
| L3 | 落盘与解析（frontmatter/yaml、mcp.json、档案目录）的错 | 跨进程时序 |
| L4 | 端到端命令往返 | 界面观感（本能力没有界面） |

## 豁免与新鲜度

以上 `pass` 的证据文件 30 天内有效；超过 30 天或被验证代码有改动需重跑（`record-verification` 会记时间与命令）。
