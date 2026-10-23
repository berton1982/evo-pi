<!-- TODO-init-scaffold（由 state.mjs init 从 references/templates/ARCHITECTURE.md 铺底）
     1. 逐节把占位符换成真实内容（不要留 <...>）
     2. 填完后删掉这段注释——留着的 TODO 就是没做完
-->

# 全局架构模板 — `<program-run>/ARCHITECTURE.md`

> P2.5 门检查第 1/2/3/5 节存在；`arch/rules.json` 必须可被机器加载；
> `arch/communication.md` 的机制必须覆盖 `rules.json.mechanisms` 全集且有「反例」列。

# 架构 — evo-pi

## 1. 层与禁止边

```
ui (presentation)  ──►  use-cases  ──►  domain
                            │
                            ▼
                         ports (接口)  ◄── adapters (实现)  ◄── infrastructure (机制)
```

读法（别照抄名词，按本项目技术栈改）：

- **依赖只能沿箭头反向**：`ui` 知道 `use-cases`；`use-cases` 只知道 `ports`（接口）与 `domain`；
  `adapters` 实现 `ports`，`infrastructure` 提供机制。**`ui` 永远不依赖 adapters / infrastructure。**
- **`ports` 不是一层**，是 DIP 的接口面：它是 `use-cases` 的**出边**，不是 `adapters` 的下游。
  把 ports 画在 adapters 下面会让"用例依赖接口、实现依赖接口"变成"实现依赖接口、用例依赖实现"。
- **层名由本项目决定**：`domain/use-cases/adapters` 是 Clean Architecture 的叫法；
  前端项目常见的等价切法是 `domain / feature(hook+view model) / ui / data-source`。
  名词不同不算违规，**依赖方向错才违规**；写进 `arch/rules.json.layerOrder` 的就是本项目的裁决。

> 这一段是**架构决策（AD）**，不是通用设计原则。通用原则只到 `DIP`（依赖抽象）为止，
> 具体怎么分层在本文档与 `arch/rules.json` 里定，由 D6（层序无环）与 D10（与 AD 一致）判。

| 禁止边 | 原因 | 怎么拦 |
|---|---|---|
| `web/**` → `core/**/adapters` | 前端不得直连实现（等价于 ui 不得跨过 use-cases 够到 adapters） | biome `noRestrictedImports` + C5 门 |
| `domain/**` → 任何上层 | 领域层不能被基础设施污染 | review + D6 层序 |

## 2. 通信机制

详见 `arch/communication.md`。每类交互**只能**用指定机制，矩阵不许留空。

## 3. 状态归属

| 类别 | 归属 | 判据 | 反例 |
|---|---|---|---|
| 服务端数据 | react-query cache | 有网络来源、可失效 | 复制进 store |
| UI 状态 | zustand slice | 只影响本机界面 | 放 URL |
| 可分享/可回退状态 | URL searchParams | 刷新/后退要保留 | 只放 store |
| 派生状态 | 现算 | 能由上面三类推出 | 再存一份 |

## 4. 错误分类

封闭枚举：`NOT_FOUND` / `INVALID` / `UNAVAILABLE` / `UNKNOWN`。新增要改 AD。

## 5. 流式与订阅

- 唯一入口：<名字>
- 唯一 reducer：<名字>
- 取消：`AbortSignal`；背压：<策略>
- 禁止：组件内 `useEffect` 直连 SSE
