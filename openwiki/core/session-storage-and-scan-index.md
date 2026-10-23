---
type: architecture
title: 存储适配与 scan-index：指纹缓存、持久化与 id 反查
description: 说明 FileSystemSessionStorage 如何借 SDK 组装 SessionInfo、scan-index 的三层结构（内存缓存 / 落盘格式 / debounce 写盘）与淘汰规则、evo-pi-session-index.json 的版本与冷重建契约，以及 getSessionFileForId 反查的真实代价与尚未接线的 SmCache / bounded-reader。
tags: [core, session, storage, cache, persistence, performance]
verified:
  - by: openwiki/0.7.2
    at: 2026-10-17T09:08:25.607Z
sources:
  - id: openwiki-source-bb4774a025167dcf20474522
    resource: repo://packages/core/src/session/adapters/filesystem-session-storage.ts
  - id: openwiki-source-62a0e3383e158a267aef53b0
    resource: repo://packages/core/src/session/adapters/scan-index-store.ts
  - id: openwiki-source-6ede793b4162868dc7e9cf69
    resource: repo://packages/core/src/session/domain/ports/session-storage.ts
  - id: openwiki-source-4230446e543e5ba92e8a8e84
    resource: repo://packages/core/src/session/infrastructure/bounded-reader.ts
  - id: openwiki-source-5a2ace3c610ca03a5e49932b
    resource: repo://packages/core/src/session/infrastructure/index.ts
  - id: openwiki-source-3aa9dd985b9caa7d1e17a45d
    resource: repo://packages/core/src/session/infrastructure/scan-index-cache.ts
  - id: openwiki-source-b7134922932f975df0fac51a
    resource: repo://packages/core/src/session/infrastructure/scan-index-storage.ts
  - id: openwiki-source-f72f6b9736eb8d5065d2b27d
    resource: repo://packages/core/src/session/infrastructure/sm-cache.ts
generated: { by: "pi", at: "2026-10-17T09:08:25.607Z" }
---

# 存储适配与 scan-index

这一层做三件事：把 JSONL 读成 `SessionInfo`、把"哪些文件变了"记成一个可持久化的指纹索引、按 `sessionId` 反查文件路径。

## 组件与职责

| 组件 | 层 | 职责 |
|---|---|---|
| `FileSystemSessionStorage` | adapters | 实现 `SessionStoragePort`：SDK 读盘、目录遍历、逐行流 |
| `ScanIndexStore` | adapters | 实现 `SessionIndexerPort`：把内存缓存与落盘组合起来，负责 debounce |
| `ScanIndexCache` | infrastructure | 纯内存 `Map` + LRU 近似 + 内存压力淘汰 |
| `scan-index-storage.ts` | infrastructure | 索引文件的读写与 schema 校验 |
| `SmCache` | infrastructure | `SessionManager` 实例的 LRU 缓存（**当前未接线**） |
| `bounded-reader` | infrastructure | 有界文件读取（**当前未接线**） |

## FileSystemSessionStorage：SDK 组装而非 SDK 全包

SDK 不暴露 `buildSessionInfo`，所以 `readSessionInfo` 手工组装 `SessionInfo`：

1. `SessionManager.open(filePath)`，**任何异常都吞掉返回 `null`**（文件缺失、损坏、格式不对无法区分）。
2. 取 header；无 header 直接返回 `null`。
3. 遍历全部 entry，派生三个字段：
   - `name` 取最后一条 `session_info` entry 的 `name`（空串视为未设置）。
   - `firstMessage` 取**第一条** user 消息中 text 块拼接后的文本；都没有则填字面量 `(no messages)`。
   - `modified` 按"最新 entry 时间 → header 时间 → 文件 mtime"三级回退。
4. `messageCount` 用 `manager.getEntryCount()`；`allMessagesText` 恒为空字符串（注释说明按需在 adapter 内计算，Phase 1 未做）。

`readEntries` 同样吞异常返回 `[]`——这意味着"文件不存在"与"文件损坏"在上层都表现为空数组，只有 `getSessionFileForId` 返回 `null` 才会被上层翻译成 `SessionNotFoundError`。

`streamForSearch` 是异步生成器：`createReadStream` + `readline.createInterface({ crlfDelay: Infinity })`，因此 CR / LF / CRLF 三种换行都能正确切分；`finally` 里显式 `close()` + `destroy()` 释放资源。

目录遍历是自写的递归 `walkJsonl`：从 `${agentDir}/sessions` 出发，对每个子目录递归，收集所有 `.jsonl` 文件。

## scan-index 三层结构

### 内存缓存（ScanIndexCache）

- 底层是 `Map<string, IndexEntry>`，**依赖 Map 的插入顺序**实现近似 LRU：`get`/`set` 都先 `delete` 再 `set` 以刷新 recency。
- 内存压力淘汰：`size > EVICTION_THRESHOLD`（1000）时删除最旧的 `EVICTION_THRESHOLD * EVICTION_FRACTION`（10%）条。淘汰的条目并没有丢失——它们在磁盘上，下次扫描会按指纹重建。
- 另有 `evictStale(present)` 用于批量删除不在当前枚举结果里的条目。

### 落盘格式（scan-index-storage）

- 文件名固定为 **`evo-pi-session-index.json`**，落在 `agentDir` 根下。参考实现用的是 `pi-web-session-index.json`，刻意取不同名字以避免两个应用共用同一 agentDir 时互相覆盖。
- schema：`{ version: 1, entries: { "<绝对路径>": { id, filePath, mtimeMs, size } } }`。
- 加载时**任何异常都静默降级为冷重建**：文件不存在、读失败、JSON 解析失败、不是普通对象、`version` 不等于 `SCAN_INDEX_FORMAT_VERSION`、单条 entry 字段类型不合法（`id` 非字符串、`mtimeMs` 非有限数、`size` 非非负整数等）——都只丢弃对应条目或整个索引，从不抛错。
- `version` 字段的作用就是让加载方判断"能否 warm-load"；SDK 形状变化时升版本即可整体冷重建。

### debounce 写盘（ScanIndexStore）

- 构造时 `loadPersistedIndex` warm-load 磁盘索引到内存。
- `invalidate()` 无论单条还是全量，都会 `schedulePersist()`：**500ms debounce** 后写盘，连续 invalidate 只写一次。
- `persist()` 是显式同步写盘入口，会先清掉待执行的 debounce 定时器。
- `getCache()` 暴露底层缓存给 adapter 调用 `set` / `evictStale`。

> **写盘副作用**：`persistIndex` 会 `mkdirSync` 并 `writeFileSync` 到 `agentDir`。任何在未覆盖 `PI_CODING_AGENT_DIR` 的进程里构造 `ScanIndexStore` 的代码（包括导入 web route 的测试）都会写真实 `~/.pi/agent/`。详见[本地隔离与 live 数据](../operations/local-isolation-and-live-data.md)。

## getSessionFileForId 的真实代价

按 id 反查文件是三个读侧用例的共同第一步（`readSessionContext` / `readSessionEntries` / `readSessionTree` 都调它）。实现是：枚举全部 `*.jsonl` → 逐个读**首行** → `JSON.parse` → 比对 `type === 'session'` 且 `id` 相等。

方法上方的注释写着"只读首行更快，因为 header 永远是第一行"。但代码是：

```ts
readFileSync(pathStr, { encoding: 'utf8' }).split('\n', 1)[0]
```

`readFileSync` **没有长度参数，会把整个文件读进内存**，`split('\n', 1)` 只是事后丢弃其余内容。真实会话文件常在数百 KB 到数 MB 量级，因此：

- 单次 id 反查的代价 = agentDir 下**全部** session 文件的字节量之和（加上 N 次 JSON.parse）。
- 用户每点一次会话行，就要付一次这个代价；`listSessions` 也是同样的读法。
- 注释里的"tiny file"假设与实际数据规模不符。端口注释自己承认了这点——"最坏情况是每次点击多解析一个 header，Phase 2 可接受，Phase 3+ 可以缓存"。

要真正只读首行，应该改用 `openSync` + 一次定长 `readSync`（infrastructure 层的 `readBoundedLines` 已经实现了这个模式，header 上限 64KB），或把 id→path 映射缓存进 `ScanIndexStore`（`header.id` 创建后不再变化，是稳定的）。

## 未接线的两个模块

`SmCache` 与 `bounded-reader` 在 `infrastructure/index.ts` 中正常导出，各自有完整测试，但 `JsonlSessionRepository` 与 `FileSystemSessionStorage` **都没有引用它们**：

- `SmCache`（默认容量 256 个 `SessionManager`）本应避免重复 `SessionManager.open` 的解析开销——但 storage 每次调用都直接 `SessionManager.open(filePath)`。
- `readBoundedLines` / `readBoundedTailLines`（header 64KB / relation 256KB / tail 64KB）本应避免整文件读取——但同样没有调用点。

结论：当前 list / context / search 三条读路径**没有任何缓存或分块读取**，每次请求都是全量 SDK 解析。这一点在评估性能问题时容易被注释误导。

## 相关页面

- [session capability](./session-capability.md) — 端口契约与 repository 编排
- [session 搜索](./session-search.md) — 搜索如何绕过这套缓存
- [本地隔离与 live 数据](../operations/local-isolation-and-live-data.md) — `PI_CODING_AGENT_DIR` 与索引写盘副作用
- [Clean Architecture 四层落地](./clean-architecture-layers.md) — 这些组件在四层中的位置
