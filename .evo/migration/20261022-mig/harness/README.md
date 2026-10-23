# harness — 离线快照对账装置（E2）

> **为什么不直连 30141**：30141 是用户的实时 pi-web，MEMORY §6.1 明令不触碰。所以采集走**离线快照**：先在只读副本上截取 dom/a11y/network，再在 evo-pi 上跑同一脚本比对。

## 目录

| 路径 | 内容 |
|---|---|
| `harness/registry.json` | 对账脚本登记表（`flows[]`：id / kind / status / file / reason） |
| `harness/assert.mjs` | 断言侧：归一化 + 锚点抽取 + 差异对照 |
| `harness/capture.mjs` | 采集侧（P2 前必须存在）：打开一个 flow，落四份快照 |
| `snapshot/<flow>/a11y.json` | 可访问性树（断言主输入） |
| `snapshot/<flow>/dom.json` | 关键节点 computed style（视觉回归用） |
| `snapshot/<flow>/network.json` | 请求列表（方法+路径+状态，不含 body） |
| `snapshot/<flow>/meta.json` | 采集时间、build id、cwd、语言、主题 |

## 状态语义（门会读这几个词）

| status | 含义 | 判据 |
|---|---|---|
| `captured` | 已有快照 | `snapshot/<id>/{a11y,dom}.json` 都必须存在 |
| `manual` | 只能人工验证 | 必须写 `reason`（≥10 字） |
| `pending` | 还没做 | 允许存在，但 C6 会点名 |

## 加一个 flow 的顺序

1. 在 `registry.json` 加一条（先 `pending`）。
2. 写 `e2e/parity/<id>.spec.ts`（只做"打开 + 等待稳定"）。
3. 跑 `capture.mjs` 落快照 → 改 `captured`。
4. `node assert.mjs --flow <id>` 必须在两边都通过。
