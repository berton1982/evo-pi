# 能力切片 — 18 个 god → 8 个能力 + 1 个底盘

> P3 门 `capabilityPlan` 解析本文件的归属表：每个 god **恰好出现一次**；引用 god 的行必须带 R 级。
> 切法按**能力**（用户能感知的一段功能）而不是按文件；一个 god 想归两个能力，说明它的职责要先拆。

## 1. 能力清单（归属表）

| 能力 | 名称 | 包含 god | R 级 | 行数合计 | 交付形态 |
|---|---|---|---|---|---|
| C-A | 代理运行时 | `useAgentSession.ts`(R3 2805)、`rpc-manager.ts`(R3 2757)、`subagents.ts`(R2 1002)、`mcp-host.ts`(R2 1105) | R3 | 7669 | `core/agent` 四层 + SSE route |
| C-B | 会话编排 | `AppShell.tsx`(R3 2796，布局部分归 H 底盘) | R3 | 2796 | `web/components/app-shell` 编排层 |
| C-C | 会话面 | `ChatWindow.tsx`(R3 2282)、`MessageView.tsx`(R2 2161) | R3 | 4443 | `web/components/sessions` |
| C-D | 输入区 | `ChatInput.tsx`(R2 2869) | R2 | 2869 | `web/components/chat-input` |
| C-E | 会话库 | `SessionSidebar.tsx`(R2 3165)、`SessionTree.tsx`(R2 1131) | R2 | 4296 | `web/components/sidebar` |
| C-F | 文件 | `FileViewer.tsx`(R2 1897)、`FileExplorer.tsx`(R2 1409) | R2 | 3306 | `web/components/files` + files route |
| C-G | MCP | `McpConfig.tsx`(R2 2258)、`mcp-config-helpers.ts`(R1 1515)、`mcp-import-core.ts`(R1 1229) | R2 | 5002 | `web/components/mcp` + `core/mcp` 解析 |
| C-H | 设置 | `ModelsConfig.tsx`(R1 2313)、`SkillsConfig.tsx`(R1 1089)、`PluginsConfig.tsx`(R1 1087) | R2 | 4489 | `web/components/settings/*` |

**底盘 H**（吸收，不单独占 god 归属）：`AppShell.tsx` 的布局几何、面板持久化、主题、快捷键、错误边界、Toast 通道 → `chassis/CONTRACT.md`。

## 2. 拓扑序

```
H0/H1/H2/H3（底盘：布局 → 框架 → 通道 → 验收）
        │
        ▼
C-A（代理运行时：先有数据和事件，后面才谈得上显示）
        │
        ├──► C-B（会话编排：跨区状态 + URL 同步）
        │         ├──► C-C（会话面）
        │         └──► C-D（输入区）
        ├──► C-E（会话库）
        ├──► C-F（文件）
        ├──► C-G（MCP）
        └──► C-H（设置）
```

理由：C-A 定义事件与数据形状；C-B 编排跨区状态（切会话/切 cwd/失效传播），其余四个是它下游的**展示与操作**。C-E/F/G/H 彼此无依赖，可串行任意顺序。

## 3. 裁线

| 里程碑 | 能力 | 说明 |
|---|---|---|
| M0 | H0–H3 + C-H 的 `SkillsConfig.tsx`（R1 试点） | 先证明工具链能跑通，再谈规模 |
| M1 | C-A → C-B | 能当日常工具用的最小集合（列表/读消息/发送/流式） |
| M2 | C-C → C-D → C-E | 会话主界面完整 |
| M3 | C-F → C-G → C-H 其余 | 割接前补齐 |

**不可裁的**：C-A、C-B、H（没有它们，其余能力没有数据可显示）。
**可后置的**：C-G（MCP 配置）、C-F（文件预览）——不影响"能对话"。

## 4. 每能力的验收物（PM 视角）

| 能力 | 用户能做什么 | 被什么挡住 |
|---|---|---|
| C-A | 发消息、看流式回复、中止 | 无 |
| C-B | 切会话、切 cwd、URL 可分享 | 依赖 C-A 的事件 |
| C-C | 读消息、看工具调用与思考块 | 依赖 C-B 的选中态 |
| C-D | 输入、@提及、/命令、草稿保留 | 依赖 C-A |
| C-E | 浏览会话列表、搜索、重命名 | 依赖 C-A 的索引 |
| C-F | 预览文件、目录树 | 依赖 C-B 的右区 |
| C-G | 看/改 MCP 配置、登录 | 独立 |
| C-H | 改模型/技能/插件设置 | 独立 |
