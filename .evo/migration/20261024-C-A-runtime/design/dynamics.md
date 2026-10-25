# 动态视图：命令链路 / 事件归约 / MCP 准备

## 1. 一条 prompt 的完整链路

```mermaid
sequenceDiagram
    participant U as M-orchestration
    participant UC as M-use-cases
    participant D as M-domain
    participant PT as P-A-01 传输端口
    participant RS as P-A-02 会话读端口
    U->>UC: dispatchCommand("prompt", text)
    UC->>D: admitPrompt(sessionId) 取串行令牌
    alt 已有 run 在跑
        D-->>UC: 排队（不丢）
    else 空
        D-->>UC: 立即放行
    end
    UC->>PT: send({name:"prompt", generation})
    PT-->>U: 事件流 message_start / message_update* / message_end
    U->>D: reduceEvent(state, event)
    alt request_id 小于当前
        D-->>U: 丢弃（乱序保护）
    else 当前或更高
        D-->>U: 新状态（不可变）
    end
    U->>RS: 落盘后再读一次终态（可选）
    RS-->>U: 终态消息
```

## 2. MCP 准备链路（prompt 前）

```mermaid
sequenceDiagram
    participant UC as M-use-cases
    participant MP as P-A-03 MCP 运行时端口
    participant PR as P-A-04 档案端口
    UC->>MP: prepare(signal, wait=true)
    alt 连接就绪
        MP-->>UC: ready（工具列表可用）
    else 超时
        MP-->>UC: degraded（带警告继续，不阻塞发送）
    end
    UC->>PR: list(cwd)
    PR-->>UC: 项目档案覆盖同名用户档案
```

## 3. 准入状态机

```mermaid
stateDiagram-v2
    [*] --> idle
    idle --> admitted: admitPrompt
    admitted --> running: send(prompt)
    running --> idle: agent_end
    running --> aborting: abort
    aborting --> idle: run 结束（队列保留）
```

## 4. 通知队列状态机

```mermaid
stateDiagram-v2
    [*] --> empty
    empty --> one: addNotice
    one --> two: addNotice
    two --> three: addNotice
    three --> three: addNotice（最旧进入 exiting）
    three --> two: exiting 结束
```

## 5. 失败与取消：谁负责收尾

| 情形 | 谁收尾 | 收尾动作 | 不许发生 |
|---|---|---|---|
| prompt 失败 | M-use-cases | 归还准入令牌、通知入队 | 令牌不归还导致会话卡死 |
| 传输断开 | M-infra | 标记 closed、通知重连、拒绝新调用 | 静默重试把旧请求再发一次 |
| 用户取消 | M-orchestration | abort → 等 run 结束 → 归还令牌 | 直接丢 Promise 导致状态永挂 |
| 会话切换 | M-use-cases | 旧 generation 作废 | 旧回包写入新会话 |

## 6. 行为 ↔ 图对应

| 行为 | 落在哪张图 |
|---|---|
| B-001 / B-015…B-024 | 图 1（命令链路与事件归约） |
| B-028…B-032 | 图 3（准入与乱序守卫） |
| B-033…B-038 | 图 2（MCP 准备） |
| B-025 / B-026 | 图 4（通知队列） |
