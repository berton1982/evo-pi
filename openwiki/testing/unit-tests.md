---
type: testing
title: 单元与集成测试：vitest 单根配置、覆盖范围与当前失败项
description: 说明根 vitest.config.ts 的 single-root 策略与环境切换方式、web test-setup 的 polyfill 职责、测试分层结构与性能预算，并如实记录当前 pnpm test 的真实结果——327 个用例中 5 个失败加 1 个性能用例抖动的成因与已验证修法。
tags: [testing, vitest, unit-test, integration-test, flaky-test, performance-budget]
verified:
  - by: openwiki/0.7.2
    at: 2026-10-17T09:08:25.607Z
sources:
  - id: openwiki-source-95ebef8d5ce56ff21d136397
    resource: repo://MEMORY.md
  - id: openwiki-source-1d279ce89dac0b986dab16aa
    resource: repo://packages/core/src/session/adapters/in-memory-session-repository.ts
  - id: openwiki-source-8eb164e1881ae861754df46e
    resource: repo://packages/core/src/session/adapters/jsonl-session-repository.test.ts
  - id: openwiki-source-8e1389d9cf9e65ce13a6f3de
    resource: repo://packages/core/src/session/adapters/jsonl-session-repository.ts
  - id: openwiki-source-62a0e3383e158a267aef53b0
    resource: repo://packages/core/src/session/adapters/scan-index-store.ts
  - id: openwiki-source-ba7a8f5a3db767b1edb4fb1d
    resource: repo://packages/core/src/session/domain/ports/ports.test.ts
  - id: openwiki-source-762a2bdef199ff675386cd29
    resource: repo://packages/core/src/session/domain/session-info.test.ts
  - id: openwiki-source-7064439ada6fef68c94b9036
    resource: repo://packages/core/src/session/domain/types.test.ts
  - id: openwiki-source-1dcfc058765a2582f90e0e48
    resource: repo://packages/core/src/session/infrastructure/__fixtures__/sessions/pi-web-compat.test.ts
  - id: openwiki-source-df9c5ebb0504aea83e9439ec
    resource: repo://packages/core/src/session/infrastructure/pi-web-roundtrip.test.ts
  - id: openwiki-source-b7134922932f975df0fac51a
    resource: repo://packages/core/src/session/infrastructure/scan-index-storage.ts
  - id: openwiki-source-cb51b48bd2cc6ea5f8376f13
    resource: repo://packages/core/src/session/use-cases/__test-helpers__.ts
  - id: openwiki-source-7e31ed519ac2f7e5421daff2
    resource: repo://packages/core/src/session/use-cases/list-sessions-perf.test.ts
  - id: openwiki-source-628f29d9f1d3d000b89ba722
    resource: repo://packages/core/src/session/use-cases/read-side-perf.test.ts
  - id: openwiki-source-9d47841644d9932ad9079789
    resource: repo://packages/web/src/app/api/sessions/%5Bid%5D/context/route.test.ts
  - id: openwiki-source-eb345e2e17bf1fecdc921e61
    resource: repo://packages/web/src/app/api/sessions/%5Bid%5D/context/route.ts
  - id: openwiki-source-3740f888249be5aba0158eb4
    resource: repo://packages/web/src/components/sidebar/session-tree.test.tsx
  - id: openwiki-source-84132832467d154f2736ea86
    resource: repo://packages/web/src/components/sidebar/Sidebar.test.tsx
  - id: openwiki-source-c560b764fea9e1d479552dbb
    resource: repo://packages/web/src/test-setup.ts
  - id: openwiki-source-fbadcd8591b65031efaaedce
    resource: repo://vitest.config.ts
generated: { by: "pi", at: "2026-10-17T09:08:25.607Z" }
---

# 单元与集成测试

所有单元测试由**根目录一份** `vitest.config.ts` 驱动，子包不各自配置。当前真实状态：**41 个测试文件、327 个用例，其中 5 个失败、1 个性能用例存在抖动**。本页同时说明配置结构与这些失败项的成因。

## 单根配置策略

```ts
test: {
  name: 'evo-pi-monorepo',
  include: ['packages/**/*.test.ts', 'packages/**/*.test.tsx',
            'pi-packages/**/*.test.ts', 'pi-packages/**/*.test.tsx'],
  exclude: ['node_modules/**', '**/node_modules/**', 'dist/**', 'coverage/**', '**/.turbo/**'],
  environment: 'node',
  setupFiles: ['./packages/web/src/test-setup.ts'],
  globals: false,
}
```

几个刻意的选择：

- **single-root 而非 vitest workspaces**：配置注释解释了原因——workspaces 模式要求每个子项目都有自己的 vitest.config.ts，而当前 monorepo 用一份 `include` glob 覆盖全部包更简单。等 P5+ 有 node / jsdom 混合需求时再拆。
- **`globals: false`**：测试必须显式 `import { describe, it, expect } from 'vitest'`，理由是保持 TS strict 与 IDE 类型提示。
- **默认 `environment: 'node'`**，需要 DOM 的文件用文件头注释 `// @vitest-environment jsdom` 逐个切换。core 侧与导入 SDK 的 route 测试因此保持 node 环境（SDK 需要 Node 而非 jsdom）。
- **`oxc.jsx: 'automatic'`**：vite 8 默认的 JSX 变换是 `preserve`（沿用 tsconfig），会让 `@testing-library/react` 的 render 失效，因此显式改为自动 runtime 调用。
- **`resolve.alias` 镜像 web 的 tsconfig paths**，让测试能直接用源码里的 `@/` 别名。

`setupFiles` 指向 web 的 `test-setup.ts`——它虽然是 web 的文件，但作为全局 setup 对 core 测试也会执行。文件内部全部用 `typeof window !== 'undefined'` 守卫，所以 node 环境下是空操作。

## test-setup 的 polyfill 职责

jsdom 不提供的浏览器 API 在这里补齐：

| polyfill | 为什么需要 |
|---|---|
| `window.matchMedia` | next-themes 用它探测系统配色；返回带 deprecated `addListener` 的完整 mock |
| `ResizeObserver` | react-resizable-panels 使用；**必须是 class 而不是 `vi.fn()`**，因为库内部 `new ResizeObserver(cb)`，mock 函数当构造器会抛 "not a constructor" |
| `IntersectionObserver` | 虚拟化/懒加载路径的兜底 |

## 测试分层

| 层 | 手段 | 代表文件 |
|---|---|---|
| domain 类型契约 | 编译期为主，运行时断言极少 | `domain/ports/ports.test.ts`、`domain/types.test.ts`、`domain/session-info.test.ts` |
| use-case 单测 | `InMemorySessionRepository` + `__test-helpers__.ts`，零 fs / 零 SDK | `use-cases/list-sessions.test.ts`、`use-cases/read-side.test.ts` |
| adapter 集成 | 真实 `FileSystemSessionStorage` + `ScanIndexStore`，mkdtemp 临时目录 | `adapters/jsonl-session-repository.test.ts`、`adapters/filesystem-session-storage.test.ts` |
| 索引与基础设施 | 纯内存 + 临时文件 | `adapters/scan-index-store.test.ts`、`infrastructure/scan-index-cache.test.ts`、`infrastructure/bounded-reader.test.ts` |
| JSONL v3 兼容 | `__fixtures__/sessions/pi-web-real.jsonl` | `infrastructure/__fixtures__/sessions/pi-web-compat.test.ts`、`infrastructure/pi-web-roundtrip.test.ts` |
| 性能预算 | 生成大规模 fixture 并计时 | `use-cases/list-sessions-perf.test.ts`、`use-cases/read-side-perf.test.ts` |
| HTTP 边界 | 直接调 route handler 的 `GET` | `app/api/sessions/**/route.test.ts` |
| UI 组件 | `@testing-library/react` + mock 虚拟化库 | `components/**/*.test.tsx`、`hooks/*.test.tsx` |

几个值得注意的点：

- **domain 层测试的价值在编译期**。`types.test.ts` / `session-info.test.ts` 的注释写得很明确：运行时断言极少，它们的作用是"如果有人删掉一个 re-export 或破坏 SDK 边界，build 会先失败"。
- **UI 测试必须 mock `@tanstack/react-virtual`**，因为 jsdom 的 `clientHeight` 为 0，虚拟化器会渲染 0 行。
- **JSONL 兼容测试用的是真实文件**（从用户机器的 pi-web 会话复制而来），断言 header `version === 3`、`id`、`cwd` 与 message entry 的存在性。roundtrip 测试还验证 SDK 的 `appendMessage` 写路径能把内容持久化。

## 性能预算

| 用例 | 规模 | 预算 |
|---|---|---|
| `listSessions` | 1000 个 session | < 2s |
| `readSessionContext` | 1000 条 entry | < 500ms |
| `searchSessions` | 100 个 session | < 3s（对齐参考实现的 TIME_BUDGET） |

测试注释解释了规模选择：规范只要求"几百条 entry"的 O(N) 防御性复制可接受，测 1000 是留 10 倍余量，同时顺带压到缓存淘汰阈值。

## 当前真实结果

```text
Test Files  1 failed | 40 passed (41)
     Tests  5 failed | 322 passed (327)
```

### 失败 1：`context/route.test.ts` 的 5 个用例（404）

**机制**——这是一处真实的测试接线缺陷，不是功能 bug：

1. 测试在 `beforeAll` 里 `mkdtemp` + 把 fixture 拷到 `<tmp>/sessions/--fixture-cwd--/`，然后设 `process.env.PI_CODING_AGENT_DIR = tmpDir`。
2. 但 `import { GET } from './route'` 是**静态 import**，ESM 会在任何测试钩子之前完成模块求值。
3. `route.ts` 在模块顶层就执行 `const SYSTEM_CONFIG = getSystemConfig()` 并 `new ScanIndexStore(SYSTEM_CONFIG.agentDir)`——此时 env 还是未覆盖状态。
4. 结果：请求打到真实 `~/.pi/agent`，而不是 tmpdir 里的 fixture。测试注释里"vitest re-evaluates per test file，所以这样可行"的假设是错的。

**证据**：报错全部是 `expected 404 to be 200`，而 fixture 的 session id `01a12854-…` 在本机 `~/.pi/agent/sessions/` 下并不存在（那些 grep 命中的文件只是正文里提到了这个 id）。

**已验证的修法**：把 env 放到**启动 vitest 之前**注入进程环境，8 个用例全部通过：

```bash
D=$(mktemp -d); mkdir -p "$D/sessions/--fixture-cwd--"
cp packages/core/src/session/infrastructure/__fixtures__/sessions/pi-web-real.jsonl "$D/sessions/--fixture-cwd--/"
PI_CODING_AGENT_DIR="$D" pnpm exec vitest run "packages/web/src/app/api/sessions/[id]/context/route.test.ts"
# → Test Files 1 passed (1) / Tests 8 passed (8)
```

更彻底的修法是让 route 延迟到请求时再解析 `agentDir`（而不是模块加载时冻结），但那会改变 composition root 的语义，属于设计决策。

**副作用**：这个失败同时暴露了一件事——默认跑 `pnpm test` 时，测试会通过 route 的 `ScanIndexStore` **写真实 `~/.pi/agent/evo-pi-session-index.json`**（实测该文件 mtime 会被刷新），这与 `MEMORY.md` §6.1 第 9 条"不写 live 数据目录"的纪律冲突。详见[本地隔离与 live 数据](../operations/local-isolation-and-live-data.md)。

### 失败 2：`list-sessions-perf.test.ts` 的计时抖动（flaky）

```ts
expect(secondMs).toBeLessThanOrEqual(firstMs * 1.1)
// 实测：393.74ms vs 上限 392.18ms
```

这是纯计时比较，且**逻辑上不可能稳定成立**——因为 `listSessions` 的缓存命中分支根本没有短路实现（见[session capability](../core/session-capability.md)），两次扫描的工作量完全相同，所谓"第二次更快"只是在噪声范围内成立。属于 flaky 断言，不是功能回归。

### 如何解读 `pnpm test` 的结果

- **5 个 context route 失败**：测试接线缺陷，掩盖了 route 的真实行为（修法见上）。
- **1 个 perf 抖动**：断言设计问题。
- 其余 322 个通过，其中 core 侧的 25 个左右覆盖了 session capability 的主要路径。

跑测试时建议先注入临时 `PI_CODING_AGENT_DIR`，既避免污染 live 目录，也顺带让那 5 个用例转绿。

## 相关页面

- [端到端测试](./e2e-playwright.md) — 浏览器层验证与两者的分工
- [HTTP API 层](../web/api-routes.md) — 被测的三个 route
- [session capability](../core/session-capability.md) — 被测的 use-case 与 adapter
- [本地隔离与 live 数据](../operations/local-isolation-and-live-data.md) — env 覆盖纪律
- [开发工作流](../operations/developer-workflow.md) — `pnpm test` 的执行方式
