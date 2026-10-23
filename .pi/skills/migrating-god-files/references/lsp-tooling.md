# LSP 工具：就绪检查、能力矩阵、陷阱（唯一权威）

> 迁移自 `.pi/skills/god-file-migration/references/lsp-tooling.md`（v1，2026-10-20 实测），
> 并按 v2 的脚本名与本仓 2026-10-21 的实测补充。
>
> **不要凭工具名猜能力**：`code_health` 的能力声明 ≠ 实际可用。LSP 挂了的时候，
> 任何"我读完了这个文件"的结论都是假的（见 §四 T1）。

## 一、动手前：LSP 就绪检查（不可跳过）

### 1. 先看状态

```
code_health({ scope: ".", include: ["servers"], level: "detailed", refresh: true })
```

| 现象 | 含义 | 处置 |
|---|---|---|
| `LSP: ready` + server `running` | 正常 | 直接用 |
| `LSP: pending` + `workspace routes: 1 error` | **路由启动失败**（最常见） | 读 `Diagnostic refresh attempt` 里的 `initialize failed` 原文，按 §1.2 对症 |
| server `missing` | `typescript-language-server` 不在 PATH | 本仓应有 `~/.nvm/versions/node/v*/bin/typescript-language-server` |
| server 存在但 `not running` | 项目未信任 / 被 exclude | 信任项目后重启 pi；检查 `code-intelligence.exclude` |
| `Structural: not ready` | Tree-sitter 运行时缺 | 语义工具仍可用；仅结构化检索不可用 |
| 一切正常但工具仍报错 | client 是会话级进程 | 重启 pi 会话 |

### 1.2 本仓实测：`Could not find a valid TypeScript installation`

2026-10-21 在本仓（`/home/berton/evo-pi`）实测到的**真实根因**，与"工具坏了"无关：

```
typescript: initialize failed: Could not find a valid TypeScript installation.
Please ensure that the "typescript" dependency is installed in the workspace
or that a valid `tsserver.path` is specified.
```

- 本仓 `packages/*/node_modules/typescript` 是 **TypeScript 7.0.2（原生编译器发行版）**，
  它的 `lib/` 只有 `getExePath.js` / `tsc.js` / `version.cjs`，**没有 `tsserver.js`**，
  也没有 JS API（`require('typescript').createLanguageService === undefined`）。
- `typescript-language-server` 6.0.2 需要带 `tsserver.js` 的 TypeScript 5.x。
- 结果：整条 TS 路由启动失败 → 所有 `code_resolve` / `code_inspect` 报
  **`No LSP client can serve this file`**。这个报错只描述症状，不知道真因的人会去怀疑路径、tsconfig、gitignore，
  实际与它们无关。

**修法**（已验证恢复 `running`）：

```sh
npm i -g typescript@5.9.3      # 只要一个带 tsserver.js 的 5.x，不动仓内 TS7
```

```json
// .pi/supi/config.json（项目级路由覆盖）
{
  "lsp": {
    "servers": {
      "typescript": {
        "initializationOptions": {
          "tsserver": { "path": "/home/berton/.nvm/versions/node/v24.19.0/lib/node_modules/typescript/lib/tsserver.js" }
        }
      }
    }
  }
}
```

保存后必须 `code_health({ refresh: true })` 触发启动重试（`startup retry: 1 route recovered`），
或重启 pi。验证：`code_resolve({ target: { file: "ref_projects/pi-web/components/SkillsConfig.tsx" } })`
应返回声明列表而不是 `No LSP client`。

> 判断"仓内 TS 能不能被 LSP 用"的一行检查：
> `node -e "console.log(require('<path>/typescript/package.json').version, !!require('<path>/typescript/lib/tsserver.js'))"`
> —— `7.x` + `false` 就是本仓这种情形。

### 1.3 `ref_projects/` 能不能被 LSP 服务

`ref_projects/` 在 `.gitignore` 里，而自动 LSP 工作会应用 `.gitignore` 规则（supi 文档 `supi-code-intelligence/README.md`）：自动工作排除
`.git`/`node_modules`/`dist`/… + `code-intelligence.exclude` + `.gitignore`）。
但**显式指定的文件/目录请求不受影响**——实测 `code_resolve` 直接给 `ref_projects/pi-web/...tsx` 的绝对/相对路径可用。

所以：**不需要**把 `ref_projects` 加进 tsconfig，也不需要改 exclude。
唯一前置是 §1.2 的 TS 路由能起来。

## 二、能力矩阵（实测）

| 工具 | 可用 | 实测结论 | 关键约束 |
|---|---|---|---|
| `code_health` | ✅ | `LSP: ready` + `typescript @ . — running` | 路由未就绪时先跑它，`refresh: true` 触发启动重试 |
| `code_resolve`（file） | ✅ | `SkillsConfig.tsx` → **390**；`AppShell.tsx` → **1241** | **声明全集的唯一权威来源**；`maxResults` 给足 |
| `code_resolve`（symbol） | ✅ | 多候选跨文件 | 返回 handle 列表，必须选一个 |
| `code_inspect` | ✅ | syntax 节点 + 7 层祖先链 + enclosing symbol + hover + 诊断 | `character` 指向**标识符**不是关键字；行界权威 |
| `code_graph` · references | ✅ | AppShell 4 个引用点 | handle 或 anchor 皆可 |
| `code_graph` · callees | ✅ | "14 of 239 call sites" | **必须 anchor**；返回调用表达式 |
| `code_graph` · implements | ✅ | 对 `const` 返回 0 | 只对 class/interface 有意义 |
| `code_find` · ast | ✅ | import/export/call | query 必填非空；是名字模式不是符号身份 |
| `code_find` · semantic | ✅ | 725 符号 | 近似符号多，需人工筛 |
| `code_orientation` | ✅ | 文件概览 | **不依赖 LSP**（tree-sitter）→ LSP 挂了也能用 |
| `code_refactor_plan` · rename | ✅ | 13 处精确编辑 | 比 `code_graph` references 更全 |
| `code_refactor_plan` · update_imports | ✅ | 49 处编辑 | 骨架阶段整理 import |
| `extract_function` / `extract_variable` | ❌ | `not negotiated` | 切分点靠人读 + `code_inspect` 行界 |
| `delete_dead_code` | 探测型 | 报"no edit" = 该处无死代码 | 不可作为"删干净"的证据 |

## 三、场景 → 工具

| 要做的事 | 用 | 注意 |
|---|---|---|
| 确认 LSP 可用 | `code_health({include:["servers"],refresh:true})` | 唯一入口 |
| 文件全部声明 | `code_resolve({target:{file},maxResults:3000})` | **权威**；落盘为 `evidence/symbols-<god>.md` |
| 谁引用了某符号（精确） | `code_refactor_plan` rename 预览 | 给的是会被改的每一处 |
| 谁引用了某符号（快） | `code_graph` references | 不给精确编辑点 |
| 某函数调了谁 | `code_graph` callees（anchor） | 结果含 "of N call sites" |
| 某行的语法/祖先/行界 | `code_inspect` | 先用它确认坐标 |
| 切分点 | 人读 + `code_inspect` 行界 | `extract_function` 不可用 |

## 四、已知陷阱

| # | 陷阱 | 症状 | 修法 |
|---|---|---|---|
| T1 | **TS AST 枚举是静默降级** | `check-symbols` 报"遗漏 0 ✅"，而真值是它的 3–7 倍 → 假绿 | 分母只认 LSP 导出；降级必须显式标注 |
| T2 | 证据路径含 `[id]` 动态段 | 正则截断成 `route.ts` | 路径正则反引号界定 `` `([^`\s]+):(\d+)` `` |
| T3 | 贪婪回溯截断路径 | 同一行匹配出缺前缀路径 | 同上，不要用贪婪字符类 |
| T4 | 扩展名交替顺序 | `ts\|tsx` 把 `.tsx` 截成 `.ts` | 长的在前：`tsx?` |
| T5 | 同目录 md 引用当锚点 | `deviations.md` 报不存在 | 锚点只认含 `/` 的路径 |
| T6 | 源证据与目标落点混淆 | evo-pi 待建文件被报"锚点坏" | 不以 `ref_projects/` 开头的缺失路径 = 目标落点 |
| T7 | 证据路径前缀不统一 | 一半带前缀一半不带 | 统一用仓库相对路径 |
| T8 | JS 字符类里的 en-dash | `[–-]` 被当范围 → 行区间全解析失败 | 转义其一 |
| T9 | **仓内 TypeScript 是 7.x 原生版** | `No LSP client can serve this file` | 见 §1.2：全局装 5.9.3 + `tsserver.path` |
| T10 | 枚举范围误用整仓 | R1 单文件跑出 2764 表面点 / 502KB | `enumerate-surface --run` 默认只扫本 run 的 god |
| T11 | **分母与自己不同源** | `SkillsConfig.tsx`：tsserver navtree 450、`code_resolve` 390、program 模式 175 | 判据必须与分母同源；导出器写 `*.meta.json` 记模式与条数，门读 meta 而不是读人填的字符串（见 §5） |

## 五、符号导出器：自己起 tsserver

`scripts/enumerate-symbols.mjs` 有两条路径，差的是**分母**不是速度：

| 模式 | 机制 | `SkillsConfig.tsx` | 能不能当分母 |
|---|---|---|---|
| `--mode ts`（默认 `auto` 优先） | 起真 tsserver，`open` + `navtree` | **450** | ✅ 与编辑器同一棵树；含对象字面量属性 |
| `--mode program` | 进程内 `createLanguageService().getNavigateToItems('')` | **175** | ❌ 拿不到局部变量与结构性节点 |
| `code_resolve`（agent 工具） | supi 合并 semantic + structural | **390** | ✅ 但脚本/CI 调不到 |

每次导出都写同名 `*.meta.json`：`{mode, tsserverPath, tsVersion, project, projectLoaded, count, lines}`。
C1 的 `lspSource` 门**只读 meta**：`mode` 必须是 `tsserver`、`count` 必须与 `state.json` 一致——
试点第一轮 TS 7 原生版下，`state.mjs god --source LSP` 手填 175 也让 C1 全绿，这是「自证分母」的典型事故。

换过分母就用 `--compare <旧 symbols.md>`：新增/消失符号逐条列出，`--allow-drift` 才放行。
分母变了 ≠ 源码变了，两种都要解释清楚。

一条纪律不变：**分母质量决定结论真伪**（T1 的延伸）。降级到 `program` 模式下 `lspSource` 必红，
不是门太严，而是那份分母不足以支撑「读全」。

## 六、本仓已配置

| 项 | 值 |
|---|---|
| 扩展 | `@mrclrchtr/supi-code-intelligence`（提供 `code_*`） |
| Server | `typescript-language-server` 6.0.2（PATH 上；全局 npm） |
| 编译器 | 全局 `typescript@5.9.3`（供 tsserver）；仓内 `packages/*` 仍是 TypeScript 7.0.2 |
| 路由覆盖 | `.pi/supi/config.json` 的 `lsp.servers.typescript.initializationOptions.tsserver.path` |
| 排除 | 未配置 `code-intelligence.exclude`；自动工作遵循 `.gitignore`（`ref_projects/` 被忽略，但显式文件请求可用） |
| 信任 | 未信任项目不启动 LSP controller |
| 能力限制 | `extract_function` / `extract_variable` not negotiated；`delete_dead_code` 探测型 |
