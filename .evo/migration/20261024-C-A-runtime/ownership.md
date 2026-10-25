# 归属表（ownership）

> 由 `state.mjs`/人工按顶层声明聚块生成；区间必须无缝覆盖 1..N，类型只能是 feature/skeleton/infra/drop。
> 校验：`node .pi/skills/migrating-god-files/scripts/check-phase.mjs --run .evo/migration/20261024-C-A-runtime --phase C1`

## 文件：hooks/useAgentSession.ts

（共 2806 行，11 个区间）

| 行区间 | 归属 | 类型 | 依据 |
|---|---|---|---|
| L1-L349 | D-U-01 | feature | SessionData … isNew（55 个声明） |
| L350-L647 | D-U-02 | feature | initialChoices … loadSession（69 个声明） |
| L648-L882 | D-U-03 | feature | flight … promoteNewSession（4 个声明） |
| L883-L1150 | D-U-04 | feature | ensureNewSession … addNotice（14 个声明） |
| L1151-L1428 | D-U-05 | feature | handleExtensionUiRequest … reconcileAgentState（8 个声明） |
| L1429-L1722 | D-U-06 | feature | handleAgentEvent（1 个声明） |
| L1723-L2012 | D-U-07 | feature | handleSend … handleModelChange（7 个声明） |
| L2013-L2281 | D-U-08 | feature | handleCompact … handleBuiltinSlashCommand（7 个声明） |
| L2282-L2488 | D-U-09 | feature | sendStreamingPrompt … scrollUserMsgToTop（11 个声明） |
| L2489-L2761 | D-U-10 | feature | handleScrollPositionChange … waitingExtensionCustomUiCount（10 个声明） |
| L2762-L2806 | D-U-11 | infra | messageKeys（1 个声明） |

## 文件：lib/rpc-manager.ts

（共 2758 行，5 个区间）

| 行区间 | 归属 | 类型 | 依据 |
|---|---|---|---|
| L1-L298 | D-U-12 | feature | AgentEvent … carriedToolNames（37 个声明） |
| L299-L2080 | D-U-13 | feature | AgentSessionWrapper（1 个声明；C4 再细分） |
| L2081-L2380 | D-U-14 | feature | getRegistry … hasBusyRpcSessionForCwd（40 个声明） |
| L2381-L2492 | D-U-15 | feature | targetCwd … finishStartingSession（27 个声明） |
| L2493-L2758 | D-U-16 | feature | starting（1 个声明） |

## 文件：lib/mcp-host.ts

（共 1106 行，4 个区间）

| 行区间 | 归属 | 类型 | 依据 |
|---|---|---|---|
| L1-L340 | D-M-01 | feature | MCP_HOST_EXTENSION_NAME … stderr（45 个声明） |
| L341-L514 | D-M-02 | feature | send … DesiredServer（17 个声明） |
| L515-L1002 | D-M-03 | feature | HostInstance（1 个声明） |
| L1003-L1106 | D-M-04 | feature | McpHostOptions … McpHost（2 个声明） |

## 文件：lib/subagents.ts

（共 1003 行，4 个区间）

| 行区间 | 归属 | 类型 | 依据 |
|---|---|---|---|
| L1-L308 | D-A-01 | feature | SUBAGENT_META_TYPE … stringList（40 个声明） |
| L309-L599 | D-A-02 | feature | values … frontmatter（53 个声明） |
| L600-L897 | D-A-03 | feature | yaml … denials（58 个声明） |
| L898-L1003 | D-A-04 | feature | selected … persistedStatus（13 个声明） |

## 切分说明

- 按**顶层声明聚块**切，单块尽量 ≤300 行；`useAgentSession` 与 `AgentSessionWrapper` 这类 1700+ 行的单体先用一个粗区间兜住（`C4` 再按职责细分，不能靠 C1 猜）。
- 类型判定：不足 60 行的常量/类型簇记 `infra`（它们是被别处消费的公共定义），其余记 `feature`。
- 本能力**零砍单**：四文件都是运行时必需，没有可丢的段。
- 端口/适配器**不在本能力**：`mcp-host` 只许复用 C-G 的端口，不新建 IO。
