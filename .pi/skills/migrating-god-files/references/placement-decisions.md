# 落点归属决策（core 还是 web）

> 这份文档回答一个门答不了的问题：**这条规则该住在后端还是前端**。
> 机器判据是 `runtimeFit`（C4/C5），它只检查"声明与落点一致"；
> 声明对不对，靠这里的五问。

## 0. 先看权威分层

`docs/architecture/0001-clean-architecture-4-layer-organization.md` 定义了：

| 层 | 位置 | 拥有 | 禁止 |
|---|---|---|---|
| 1 Entities | `packages/core/src/<cap>/{domain,domain/ports}` | 实体、值对象、领域错误、端口接口 | React、fs、HTTP |
| 2 Use cases | `packages/core/src/<cap>/use-cases` | 应用业务规则（编排实体 + 端口） | 直接读写文件、React、HTTP 处理 |
| 3 Adapters | `packages/core/src/<cap>/adapters` | 端口实现（域 ↔ 基础设施翻译） | 纯领域逻辑、UI |
| 4 Infrastructure | `packages/core/src/<cap>/infrastructure` | SDK 包装、缓存、OS 级 | 领域类型、端口接口 |
| 5 Web UI | `packages/web/src/**` | React 组件、UI hook、滚动几何、展示映射 | 别的能力的领域类型、端口实现 |

## 1. 五问（按顺序问，第一个"是"就定位）

1. **它离开界面还成立吗？**
   - 成立（"发送必须幂等"、"`apply_patch` 语法怎么解析"）→ **core 的 domain / use-cases**
   - 只有界面才知道（"哪块算最终回答"、"什么时候滚到底"）→ **web 的 features / shell**
2. **它需要服务端权限吗？**（读文件、跑子进程、写磁盘）
   - 需要 → **core**，web 侧只经 `app/api/**` 路由访问
3. **它是被 route handler 消费，还是被浏览器消费？**
   - 被 `app/api/**` 消费 ≠ 必须 core，但**被浏览器消费也不等于该在 web**（这正是 C-C 的错误：chat 的 use-case 只被浏览器调，但它是业务规则）
4. **它是数据形状还是行为？** 形状（`ContentBlock`、`PromptPayload`）→ core 的 domain；行为如果属于呈现 → web
5. **两边都要同一份吗？** → 定义放 core，web `import type`；**不许各写一份**

## 2. 反例（都是真实发生过的）

| 错法 | 后果 | 正确做法 |
|---|---|---|
| 把 `use-cases/` 搬进 `web/src/features/<slice>/` | 前端开始承载业务规则，后端没有同一个真相；换个客户端就得重写 | use-cases 留 core，web 的 hook 只做"调端口 + 更新 UI 状态" |
| 把 HTTP 适配器写进 `web/src/<slice>/adapters/` | `next build` 因 `node:fs` 进浏览器 chunk 失败（G-30 前身） | 端口实现在 core 的 `adapters`，浏览器侧只在 `app/api/**` 使用 |
| 在 core 里 `import { useState } from 'react'` | 后端为了一个文案开关重新打包 | 呈现状态留 web |

## 3. 怎么被机器抓住

- `runtimeFit`（C4 plan / C5 landed）：元素缺 `runtime`、`server` 落 web、`client` 落 core、web 里出现 `use-cases/` 或 `domain/ports/`、web 直接 import `node:` → 红。
- `placement`：落点必须在 `arch/rules.json#layerPaths` 声明的层里。
- 仓库侧 `packages/web/scripts/check-boundaries.mjs`：依赖方向与体量预算。

## 4. 划线的诚实边界

`runtimeFit` 抓不到"**这条规则到底算业务规则还是呈现规则**"——那一步是人的判断。
所以 C4 的人工决策表里必须逐条写 `runtime` 与理由，签字时一起看。
