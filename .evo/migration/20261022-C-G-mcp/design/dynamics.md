# 动态视图 — C-G / `McpConfig.tsx`

> 静态图回答"谁依赖谁"，这里回答"一次交互里谁先谁后、失败走哪条路"。
> 校验：`design-gate.mjs --run .evo/migration/20261022-C-G-mcp --design-only`（D13 图节点必须是已声明 id；D17 每个端口必须在序列图里出现、每个 store 必须有状态图）

## 1. 加载与降级

```mermaid
sequenceDiagram
  participant C01 as C-01 McpPanel
  participant H01 as H-01 useMcpOverview
  participant B01 as D-B-01 load-overview
  participant P01 as P-S-01 McpRepository
  participant ST1 as ST-01 mcpOverview
  C01->>H01: mount / cwd 变化
  H01->>B01: load(cwd)
  B01->>P01: list(cwd)
  alt 成功
    P01-->>B01: servers[]
    B01-->>H01: {ok:true, servers}
    H01->>ST1: 写入 overview，序号自增
    ST1-->>C01: 订阅：三栏渲染
  else 超时或 5xx
    P01-->>B01: {ok:false, timedOut}
    B01-->>H01: {ok:false, error}
    H01->>ST1: 保留上一次快照 + 置 overviewError
    ST1-->>C01: 降级卡片 + 重试入口
  end
  Note over H01,ST1: 回包序号小于 requestRef 的响应直接丢弃（PA-03）
```

## 2. 单条测试（按 key 去重）

与 §3 同构（H-02 → D-B-02 → P-S-02 → 写回 ST-03），差别只有"按 key 记账、可并行"和"卸载只丢回调不 abort"。

```mermaid
sequenceDiagram
  participant C04 as C-04 McpServerDetail
  participant H02 as H-02 useMcpActions
  participant B02 as D-B-02 test-server
  participant P02 as P-S-02 McpTestRunner
  C04->>H02: onTest(key)
  Note over H02: running[key] = true
  H02->>B02: test(key)
  B02->>P02: run(server)
  P02-->>B02: {ok, tools[]} | 失败
  B02-->>H02: result
  Note over H02: results[key] = result（按 key 记账）
```

## 3. 启用/停用与批量（乐观写 + 逐条记账）

```mermaid
sequenceDiagram
  participant C03 as C-03 McpServerList
  participant H02 as H-02 useMcpActions
  participant B03 as D-B-03 toggle-server
  participant B04 as D-B-04 batch-actions
  participant P01 as P-S-01 McpRepository
  participant P05 as P-S-05 ProjectTrust
  participant ST2 as ST-02 mcpSelection
  C03->>H02: onToggle(key, next)
  H02->>ST2: 立即写入新值（乐观）
  H02->>B03: toggle(key, next)
  B03->>P01: write(key, enabled)
  alt 成功
    P01-->>B03: {ok:true}
    B03-->>H02: ok
    Note over H02: 撤销条到点自清
  else 需要信任
    P01-->>B03: {ok:false, code:trust_required}
    B03->>P05: requestTrust()
    P05-->>B03: 待用户确认
    B03-->>H02: 回滚到上一次值 + 提示
  else 失败
    P01-->>B03: {ok:false}
    B03-->>H02: 回滚
    H02->>ST2: 写回旧值
  end
  C03->>H02: onBatch(groupKeys, next)
  H02->>B04: batch(groupKeys, next)
  B04->>P01: 逐条 write
  B04-->>H02: {succeeded[], failed[]}（部分成功不整批回滚）
```

## 4. 签到（服务端持有流程，客户端轮询）

```mermaid
sequenceDiagram
  participant C04 as C-04 McpServerDetail
  participant H03 as H-03 useMcpSignIn
  participant B05 as D-B-05 sign-in-flow
  participant P03 as P-S-03 McpSignInFlow
  participant ST4 as ST-04 mcpSignIn
  C04->>H03: onSignIn(server)
  H03->>B05: start(server)
  B05->>P03: begin()
  P03-->>B05: {flowId, url}
  B05-->>H03: flowId
  H03->>ST4: 写入 signInFlow
  loop 轮询直到终态
    H03->>B05: poll(flowId)
    B05->>P03: status(flowId)
    P03-->>B05: {state:pending|authorized|failed}
    B05-->>H03: 状态
    H03->>ST4: 更新 signInPoll
  end
  alt 需要落地页地址
    C04->>H03: onPasteRedirect(flowId, url)
    H03->>B05: paste(flowId, url)
    B05->>P03: submit(flowId, url)
  else 用户取消
    C04->>H03: onCancel(flowId)
    H03->>B05: cancel(flowId)
    B05->>P03: abort(flowId)
  end
  Note over H03,ST4: 组件卸载只丢回调，不发 abort（服务端流程继续）
```


## 6. 状态图（4 个 store 合成一张）

> 合成而非一 store 一图：分开画时一半是 `[*] --> Idle` 样板；读图的人真正要比对的是
> "同一时刻哪些 store 在等、谁负责推进"（如 Loading 与 Running 互不阻塞）。

```mermaid
stateDiagram-v2
  state "ST-01 mcpOverview" as O
  state "ST-02 mcpSelection" as S
  state "ST-03 mcpTest" as T
  state "ST-04 mcpSignIn" as G

  [*] --> O.Idle
  O.Idle --> O.Loading: 挂载 / cwd 变化
  O.Loading --> O.Ready: 成功且序号最新
  O.Loading --> O.Degraded: 失败
  O.Degraded --> O.Loading: 重试

  S.FromStorage --> S.Selected: 持久化值仍在清单
  S.FromStorage --> S.FirstItem: 已不存在

  T.Untested --> T.Running: onTest(key)
  T.Running --> T.Passed: ok
  T.Running --> T.Failed: 失败
  T.Running --> T.UndoPending: 测试前曾乐观写
  T.UndoPending --> T.Untested: 撤销条过期

  G.Idle --> G.Waiting: begin 成功
  G.Waiting --> G.Waiting: 轮询 pending
  G.Waiting --> G.Authorized: 服务端 authorized
  G.Waiting --> G.Failed: 服务端 failed
  G.Waiting --> G.Cancelled: 用户取消
  G.Failed --> G.Waiting: 重新发起
```

## 7. 失败与取消：谁负责收尾

| 场景 | 谁收尾 | 具体做什么 |
|---|---|---|
| 加载失败 | H-01 | 保留旧快照 + 置 `overviewError`，由 C-02 渲染重试 |
| 测试失败 | H-02 / ST-03 | 按 key 回填失败结果并从在飞集合移除，不冒泡 |
| 启用失败 | H-02 / ST-02 | 回滚到上一次值，撤销条状态一并清掉 |
| 批量部分失败 | D-B-04 | 逐条记账，失败的单独提示，成功的不回滚 |
| 签到失败 | H-03 / ST-04 | 保留 `flowId` 供重试；不自动取消服务端流程 |
| 卸载 | H-03 | 只清轮询回调，**不 abort** 服务端流程 |

## 8. 行为 ↔ 图对应

分组级映射（逐条对应见 `behaviors.md`，不在此重复）：加载/展示 → §1 + ST-01/ST-02；单条与批量动作 → §2、§3 + ST-03；签到 → §4 + ST-04；Code mode 本次不迁。
