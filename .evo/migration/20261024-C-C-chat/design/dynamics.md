# 动态视图 — C-C 会话面

## 1. 主链路：发送一轮消息

```mermaid
sequenceDiagram
  participant U as 用户
  participant C01 as C-01 ChatSurface
  participant C06 as C-06 ComposerToolbar
  participant H03 as H-03 use-composer-params
  participant B01 as D-B-01 send-turn
  participant P01 as P-C-01 agent 传输
  U->>C06: 点击发送
  C06->>H03: submit(text)
  H03->>B01: send({session, text, params})
  B01->>P01: command('prompt', payload)
  alt 成功
    P01-->>B01: accepted
    B01-->>C01: 清空草稿 + 贴底
  else 运行中
    P01-->>B01: busy
    B01-->>C06: 保持草稿并提示
  end
```

## 2. 读历史页

```mermaid
sequenceDiagram
  participant C01 as C-01 ChatSurface
  participant P02 as P-C-02 会话读
  participant B01 as D-B-01 send-turn
  C01->>P02: readPage(sessionId, {before})
  P02-->>B01: {messages, hasMore}
  B01-->>C01: 前置拼接并保持滚动锚点
```

## 3. 工具结果与 diff

```mermaid
sequenceDiagram
  participant C04 as C-04 ToolCallBlock
  participant B05 as D-B-05 patch-diff
  participant P03 as P-C-03 文件打开
  participant C05 as C-05 DiffView
  C04->>B05: parse(resultText)
  alt 解析成功
    B05-->>C05: files[]
    C04->>P03: openFile(path, line)
  else 解析失败
    B05-->>C04: null
    C04-->>C04: 降级为纯文本 patch
  end
```

## 4. 消息 store 状态机

```mermaid
stateDiagram-v2
  state "ST-01 消息与流式" as O
  [*] --> O_empty
  O_empty --> O_loading: 打开会话
  O_loading --> O_ready: 首页到达
  O_loading --> O_error: 读失败
  O_ready --> O_streaming: message_start
  O_streaming --> O_ready: message_end
  O_error --> O_loading: 重试
  O_ready --> O_empty: 会话被清空
```

## 5. 失败与取消：谁负责收尾

| 场景 | 谁收尾 | 收尾动作 |
|---|---|---|
| 发送失败 | D-B-01 | 保留草稿、运行态回落、通知入队 |
| 中断 | D-B-02 | 标"已中止"而非"失败"，已产出消息保留 |
| 读历史失败 | C-01 | 保留已加载内容，底部提供重试 |
| 流式乱序 | H-02 | 按 requestId 丢弃过期增量 |
| diff 解析失败 | C-04 | 降级纯文本，不显示空白 |

## 6. 行为对应

B-001…B-006 → 第 1、2 节；B-009…B-024 → 第 4 节；B-028…B-031 → 第 3 节；B-045 → 第 1 节末。
