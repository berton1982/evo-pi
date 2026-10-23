---
type: architecture
title: system capability：配置快照、项目信任与 agentDir 解析
description: 说明 system capability 的两个端口与 in-memory adapter 的实际行为——agentDir 的三级解析顺序、getConfig 每次重算 process.cwd() 而 web route 却把它冻结为常量、以及 checkTrust 恒为 true 导致 403 分支目前不可达。
tags: [core, system, configuration, project-trust, agent-dir]
verified:
  - by: openwiki/0.7.2
    at: 2026-10-17T09:08:25.607Z
sources:
  - id: openwiki-source-2f11c6ed0430fcd44be4bf73
    resource: repo://packages/core/src/_shared/domain/cwd.ts
  - id: openwiki-source-0b6293ded78bfff3c0ed1532
    resource: repo://packages/core/src/system/adapters/in-memory-system-adapter.ts
  - id: openwiki-source-0317c23c908903e883c31dc4
    resource: repo://packages/core/src/system/domain/project-trust.ts
  - id: openwiki-source-d2f1f72093db9acbf1d7e5dd
    resource: repo://packages/core/src/system/domain/system-config.ts
  - id: openwiki-source-c32f3c64c6a5cfed21d88b15
    resource: repo://packages/core/src/system/use-cases/check-project-trust.ts
  - id: openwiki-source-93b602c0d84cb58a1dcd9c8a
    resource: repo://packages/core/src/system/use-cases/get-system-config.ts
  - id: openwiki-source-56595e70a41c9bfedaa261d7
    resource: repo://packages/web/src/app/api/sessions/route.ts
generated: { by: "pi", at: "2026-10-17T09:08:25.607Z" }
---

# system capability

`packages/core/src/system/` 是当前最小的 capability：两个端口、两个 pass-through use-case、一个内存 adapter。它的存在意义是给"系统级状态"一个归属，而不是实现复杂逻辑。

## 结构

```text
domain/system-config.ts     SystemConfig { defaultCwd, agentDir } + SystemConfigPort
domain/project-trust.ts     ProjectTrustStatus + ProjectTrustPort
use-cases/get-system-config.ts      makeGetSystemConfig({ config }) → () => SystemConfig
use-cases/check-project-trust.ts    makeCheckProjectTrust({ trust }) → (cwd) => ProjectTrustStatus
adapters/in-memory-system-adapter.ts createInMemorySystemAdapter() → 两个端口的合并实现
```

两个 use-case 与 session capability 的 use-case 是同一形状：注入端口、返回函数、无业务判断。

`SystemConfig` 只用普通 interface 而非 branded type——注释解释了原因：端口边界已经有 `Cwd` 校验，内部再 brand 只是噪音，同时保持与 SDK `SessionInfo` 一致的朴素风格。

## agentDir 的三级解析

`resolveAgentDir()` 的优先级是：

| 顺序 | 条件 | 结果 |
|---|---|---|
| 1 | `process.env.PI_CODING_AGENT_DIR` 非空 | **原样返回**，不做 `~` 展开 |
| 2 | `HOME` 或 `USERPROFILE` 有值 | `${home}/.pi/agent` |
| 3 | 都没有 | 字面量 `'~/.pi/agent'`（不会展开，实际不可用） |

第 1 条刻意不展开 `~`：注释说明测试 fixture 用的是绝对路径，所以照搬即可；第 3 条是死代码级别的兜底——Node 的 fs API 不做 `~` 展开（注释记录了 `existsSync('~/foo')` 返回 false 的验证），真正可用的是第 2 条。

这是全仓**唯一**读取 `PI_CODING_AGENT_DIR` 的地方。任何要隔离测试数据或避免污染真实会话目录的方案，都从这里生效，详见[本地隔离与 live 数据](../operations/local-isolation-and-live-data.md)。

## getConfig 的两种生命周期

`getConfig()` 每次调用都重新 `makeCwd(process.cwd())` 并重新跑 `resolveAgentDir()`。所以在长驻进程里：

- `defaultCwd` 会跟随 `process.cwd()` 的变化（进程 chdir 或不同运行上下文下不同）。
- `agentDir` 会跟随 env 的变化——前提是 env 在调用之间被改过。

但 web 的三个 Route Handler 在**模块加载时**就把结果冻结成常量：

```ts
const SYSTEM_CONFIG = getSystemConfig()          // 模块级，进程生命周期内不再更新
const storage = new FileSystemSessionStorage(SYSTEM_CONFIG.agentDir)
```

这造成一个实际后果：测试里在 `beforeAll` 中设置 `PI_CODING_AGENT_DIR` 已经太晚——ESM 的 `import` 会被提升，route 模块及其单例在测试钩子执行前就完成了求值。详见[单元与集成测试](../testing/unit-tests.md)中当前 5 个失败用例的成因。

`SessionManager.create(cwd).getSessionDir()` 编码出的会话目录与 `agentDir/sessions` 是两回事：`getSessionDir` 只依赖 cwd，而扫描走的是 `agentDir`。因此改变 cwd 不改变扫描范围，改变 agentDir 才改变（详见 [session capability](./session-capability.md)）。

## 项目信任：一个恒真的占位实现

`checkTrust(_cwd)` 忽略入参，恒返回：

```ts
{ requiresTrust: false, trusted: true, decision: null, inherited: false }
```

`ProjectTrustStatus` 的类型本身是照参考实现定义的 7 字段形状（含 `decisionPath`、`decisionError`），注释明确标注"没有接入 SDK 的 ProjectTrustStore"，真实实现推迟到后续阶段。

**这带来一个必须知道的推论**：`/api/sessions` 里的 trust 检查分支在结构上存在但**不可达**——

```ts
const trust = checkProjectTrust(defaultCwd)
if (!trust.trusted) { return 403 }
```

也就是说，当前 evo-pi 会无条件读取 `defaultCwd` 下的会话文件，不做任何目录信任校验。这与 `MEMORY.md` §6.1 关于"不要不信任地读取用户目录"的纪律**不等价**——那条纪律目前靠 agent 自觉遵守，而不是由代码强制。如果后续接入真实 `ProjectTrustStore`，403 分支无需改动即可生效。

## 与 session capability 的共享类型

system 与 session 之间唯一的类型共享是 `_shared/domain` 的 `Cwd`：`SystemConfig.defaultCwd` 与 `ProjectTrustPort.checkTrust(cwd)` 都用它。ADR 0003 规定跨 capability 类型必须走 `_shared/`，这是该规则当前唯一的一处实例。其余共享类型（`Path`、`SessionId`、`Timestamp`）目前只在 session 内部使用。

## 相关页面

- [Clean Architecture 四层落地](./clean-architecture-layers.md) — ports-in-domain 的位置
- [HTTP API 层](../web/api-routes.md) — 403 分支的调用现场
- [本地隔离与 live 数据](../operations/local-isolation-and-live-data.md) — `PI_CODING_AGENT_DIR` 的实际影响面
- [系统全景](../overview/system-map.md) — 两个 capability 的分工
