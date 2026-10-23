---
type: architecture
title: session capability：领域模型、端口与读侧用例
description: 说明 session capability 的三个端口契约、六个 factory 式读侧用例与 JsonlSessionRepository 的编排算法，并记录几处实现与端口注释不一致的真实行为（全 agentDir 扫描、缓存不短路读盘、searchSessions 走独立全量扫描）。
tags: [core, session, ports, use-cases, repository, error-semantics]
verified:
  - by: openwiki/0.7.2
    at: 2026-10-17T09:08:25.607Z
sources:
  - id: openwiki-source-c9bd000775c883ac846b44e2
    resource: repo://packages/core/src/_shared/domain/domain-error.ts
  - id: openwiki-source-bb4774a025167dcf20474522
    resource: repo://packages/core/src/session/adapters/filesystem-session-storage.ts
  - id: openwiki-source-8e1389d9cf9e65ce13a6f3de
    resource: repo://packages/core/src/session/adapters/jsonl-session-repository.ts
  - id: openwiki-source-64bd8223985212e0b1b4010f
    resource: repo://packages/core/src/session/domain/ports/session-indexer.ts
  - id: openwiki-source-46e25a2c79f58466310bdcd9
    resource: repo://packages/core/src/session/domain/ports/session-repository.ts
  - id: openwiki-source-6ede793b4162868dc7e9cf69
    resource: repo://packages/core/src/session/domain/ports/session-storage.ts
  - id: openwiki-source-cf22d73d751c7450e8c49e53
    resource: repo://packages/core/src/session/domain/session-not-found-error.ts
  - id: openwiki-source-188a37d123921171fec71cde
    resource: repo://packages/core/src/session/domain/types.ts
  - id: openwiki-source-f910c3e2adba4dcec863fb1e
    resource: repo://packages/core/src/session/use-cases/list-sessions.ts
  - id: openwiki-source-dae76fb737544c5304e25a8f
    resource: repo://packages/core/src/session/use-cases/read-session-context.ts
generated: { by: "pi", at: "2026-10-17T09:08:25.607Z" }
---

# session capability：领域模型、端口与读侧用例

`packages/core/src/session/` 是当前唯一实现了完整读侧链路的 capability。它对上层暴露 3 个端口 + 6 个 use-case factory，实际 IO 全部委托给 pi SDK 的 `SessionManager`。

## 分层概览

```text
use-cases/  makeListSessions · makeReadSessionInfo · makeReadSessionContext
            makeReadSessionEntries · makeReadSessionTree · makeSearchSessions
              ↓ 只依赖 SessionRepositoryPort
domain/ports/  SessionRepositoryPort（业务语义）· SessionStoragePort（纯 IO）
               SessionIndexerPort（缓存）
              ↓
adapters/  JsonlSessionRepository（编排）
           FileSystemSessionStorage（SDK 读盘）· ScanIndexStore（缓存）
           InMemorySessionRepository / InMemorySessionStorage / InMemoryIndexer（测试 fake）
```

分层细节与 web 的接线方式见 [Clean Architecture 四层落地](./clean-architecture-layers.md)。

## 三个端口

### SessionRepositoryPort（业务语义）

7 个方法，覆盖列会话、按 id 读 info、读 context/entries/tree、搜索。关键契约差异在于**错误风格不统一**：

| 方法 | 找不到 session 时 |
|---|---|
| `readSessionInfo(id)` | 返回 `null` |
| `readSessionContext(id, opts)` | 抛 `SessionNotFoundError` |
| `readSessionEntries(id)` | 抛 `SessionNotFoundError` |
| `readSessionTree(id)` | 抛 `SessionNotFoundError` |

端口注释把这条差异记录为显式决定：`readSessionInfo` 保留 Phase 1 的 null-on-miss 契约以兼容旧调用方，读侧新方法改抛 typed error，理由是"比每个调用点都判 null 更干净"。

`searchSessions` 的签名在 Phase 2 发生了破坏性变更：从 `searchSessions(cwd, query) → SessionInfo[]`（占位）改为 `searchSessions(query) → SessionSearchResponse`（全内容扫描）。注释记录了这次变更的安全性论证——改动时用 `rg "searchSessions\("` 确认过除占位实现与端口声明外没有外部调用者。

### SessionStoragePort（纯 IO）

6 个方法，全部是文件/SDK 级操作：`getSessionDir`、`readSessionInfo`、`enumerateSessionFiles`、`readEntries`、`getSessionFileForId`、`streamForSearch`。分 storage 与 repository 的理由写得很清楚：storage 是可替换的 IO 实现（未来可换 in-memory / remote），repository 承载业务语义。

路径编码规则不自己实现，直接交给 SDK：`getSessionDir` 调 `SessionManager.create(cwd).getSessionDir()`，避免重复实现 `cwd → 安全目录名` 的转换。

### SessionIndexerPort（缓存）

`getIndex()` 返回内存索引引用、`invalidate(filePath?)` 让单条或整个索引失效、`persist()` 写盘。索引条目只存最小指纹字段（`filePath` / `mtimeMs` / `size` / `id`），不缓存 `SessionInfo` 本体——注释解释这是因为 created / messageCount 等字段从 SDK 读盘计算成本高。

## use-case：纯 factory pass-through

6 个 use-case 全部是同一形状的工厂函数，注入 port、返回函数，不含任何业务判断：

```ts
export function makeListSessions(deps: { repo: SessionRepositoryPort }) {
  return (cwd: Cwd, options?: { force?: boolean }) => deps.repo.listSessions(cwd, options)
}
```

这样做的收益是测试期可注入 fake port 而不碰文件系统与 SDK。代价是这些文件目前不含业务逻辑，真正的复杂度全在 adapter 层。

## JsonlSessionRepository：编排与三处真实行为

这是 capability 里唯一有实质逻辑的文件。类声明处记录了整体算法：枚举文件 → 逐个比对指纹 → 读盘组装 SessionInfo → 清理索引中已消失的路径 → 按 `modified` 倒序返回。JSONL 解析全部交给 SDK（`SessionManager.open` / `getEntries` / `getTree` / `buildSessionContext`），不自己写解析器。

有三处**实现与注释/端口声明不一致**的地方，排查性能或正确性问题时必须知道：

### 1. `listSessions(cwd)` 实际扫描整个 agentDir

`enumerateUnderDir(_dir)` 的参数带下划线前缀——它被刻意忽略，函数体直接 `return this.storage.enumerateSessionFiles()`，而后者遍历 `${agentDir}/sessions/` 下的**全部** cwd 子目录。因此传入的 `cwd` 只影响 `getSessionDir` 的调用（其结果随后被丢弃），返回的会话集合是 agentDir 下所有项目/所有 worktree 的会话，不是端口注释承诺的"cwd 下所有 session"。

后果：多项目用户的会话会混在同一个列表里；e2e 与性能测试用编码后的目录名构造 fixture，实际扫描范围也因此是整个临时 agentDir。

### 2. 缓存命中不短路读盘

`listSessions` 里的缓存分支只有一句注释（"Cache hit but we don't cache SessionInfo itself; re-read for fresh data"），没有 `continue`/`skip`。也就是说无论指纹是否命中，每个文件都会走 `storage.readSessionInfo`。scan-index 在这条路径上的实际作用只有两件事：**写入指纹**（`updateIndex`）与**清理已删除文件的条目**（对不在 `presentPaths` 里的 key 调 `invalidate`）。

`fingerprintMatches` 因此是一个已实现但当前无调用方收益的函数——性能测试里"第二次扫描更快"的断言因此本质上是噪声（详见[单元与集成测试](../testing/unit-tests.md)）。

### 3. 搜索走独立的全量扫描

`searchSessions` 不复用 `listSessions`，而是调私有 `listSessionsSummaryAll()`：枚举全部文件并逐个 `readSessionInfo`，**完全不碰 scan-index**（该方法上方的注释写着 "uses cache"，与实现不符）。搜索因此与列表是两个独立的读盘路径。

## readSessionContext 的游标与分页语义

这是读侧最复杂的方法，参数是 `leafId` / `before` / `tail`：

1. **定位**：`getSessionFileForId` 反查文件路径；空 entry 列表也按"不存在"处理。
2. **`before` 游标**：把 entry 切成"严格早于 `before` 的祖先链"。三种情况都覆盖了——`beforeIdx > 0` 取前段；`beforeIdx === 0`（`before` 是第一个 entry）返回空；`beforeIdx === -1`（游标指向不存在的 entry）也返回空。语义是客户端已有最老 entry，服务端只补更早的部分，避免重复。
3. **`tail` 取尾部**：默认 **10000**，硬上限同为 10000，下限 1。取的是 scoped 集合的**最后** N 条（初始加载即整份文件的最后 N 条）。默认值从最初的 50 提升到 10000 的原因写在注释里：真实会话有 1000+ 条 entry，默认 50 只能覆盖 3.7% 的历史。
4. **`hasMore`**：在 tail 切片之后计算——返回条数少于 scoped 总数即还有更早内容。
5. **映射成 wire 类型**：调 SDK 的 `buildSessionContext(walkEntries, undefined)`（传 `undefined` 让 SDK 以最后一个 entry 为 leaf），然后**并行数组**由 `walkEntries.filter(e => e.type === 'message').map(e => e.id).slice(-messages.length)` 得到——即在可能含非 message entry 的情况下对齐到 messages 的长度。`oldestEntryId` 取 `entryIds[0]`。

## 错误语义

`DomainError`（`_shared/domain`）是所有业务错误的抽象基类，带 `kind` discriminator 与 `cause`。session capability 定义两个子类：

- `SessionNotFoundError`：`kind = 'session_not_found'`，携带未找到的 `sessionId`。
- `SessionReadError`：`kind = 'session_read_error'`，携带可选 `sessionId` 与原始异常，用于把 SDK / JSONL 解析失败包成可识别错误。

两者都调用 `Object.setPrototypeOf(this, new.target.prototype)` 以修复 TS `extends Error` 的原型链。**注意当前覆盖不完整**：`readSessionContext` 只抛 `SessionNotFoundError`，SDK 异常（`buildSessionContext` 失败）会直接冒泡；只有 `readSessionTree` 显式 catch 并包成 `SessionReadError`。

传输层映射由调用方负责（web route 把 `SessionNotFoundError` 转 404、其他转 500），core 不感知 HTTP。

## 相关页面

- [存储适配与 scan-index](./session-storage-and-scan-index.md) — `FileSystemSessionStorage` 与索引持久化实现
- [session 搜索](./session-search.md) — 搜索算法与截断语义
- [HTTP API 层](../web/api-routes.md) — 错误如何变成状态码
- [单元与集成测试](../testing/unit-tests.md) — 这些行为的测试覆盖情况
- [Clean Architecture 四层落地](./clean-architecture-layers.md) — 端口与适配器的位置
